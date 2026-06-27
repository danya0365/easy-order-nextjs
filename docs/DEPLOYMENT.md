# Deployment

Production checklist for deploying on **Vercel** + **Turso** (libSQL) + **Cloudflare R2**.
Pairs with [`.env.example`](../.env.example) (every variable is documented there).

## 1. Provision the services

| Service | Purpose | Notes |
| --- | --- | --- |
| **Vercel** | Hosting + cron | Connect the Git repo. Framework auto-detected (Next.js). |
| **Turso** | Production database (libSQL) | Create a DB, copy its `libsql://…` URL + auth token. |
| **Cloudflare R2** | Object storage (payment slips, shop/lead images) | Create a bucket + an API token (Access Key/Secret). Without it, uploads fall back to local disk — **not durable on Vercel**, so R2 is required in prod. |
| **LINE Messaging API** *(optional)* | Push notifications + OTP login | Create an OA + Messaging channel. Set the webhook to `https://<domain>/api/line/webhook`. |
| **Cloudflare Turnstile** *(optional)* | CAPTCHA on the public contact form | Site key (public) + secret key. |

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

**Required in production** (the app `validateEnv()` hard-fails on a hosted deploy without a real DB):
- `TURSO_DATABASE_URL` — the `libsql://…` URL (NOT a `file:` path → that would lose data on every cold start).
- `TURSO_AUTH_TOKEN` — Turso token.

**Strongly recommended:**
- `CRON_SECRET` — bearer token guarding `/api/cron` (generate: `npm run gen:cron-secret`). Vercel injects it automatically for scheduled runs once set.
- `PROMPTPAY_TARGET` — the shop/platform PromptPay account top-up QRs are generated from.
- `APP_URL` — the deployed origin (used to build absolute OG/QR URLs).
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (+ `R2_ENDPOINT` if custom) — set all-or-none.

**Optional integrations** (absent = feature disabled, app still boots):
- `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_CHANNEL_SECRET` (set both or neither) · `NEXT_PUBLIC_LINE_OA_ADD_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
- `OSM_OVERPASS_URL`, `OSM_NOMINATIM_URL`, `GEO_USER_AGENT` (geocoding endpoints; defaults to public OSM)
- `SESSION_COOKIE_NAME` (defaults to `es_session`)

> `validateEnv()` (run from `instrumentation.ts` at server start) warns on missing recommended vars and **hard-fails only** when `TURSO_DATABASE_URL` is missing/`file:` on Vercel. Extend its required set cautiously.

## 3. Database migrations
- Migrations live in [`drizzle/`](../drizzle) (SQL + `meta/`), generated from the schema via `npm run db:generate`.
- The build runs `node scripts/vercel-migrate.mjs && next build` — migrations are **applied automatically on Vercel production builds only** (skipped on preview/local). A failed migration fails the build.
- First deploy seeds reference data: run `npm run db:seed:prod` against the prod DB (creates the platform admin + shop categories; idempotent). Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` first.

## 4. Cron (Vercel Hobby = 1 schedule)
- [`vercel.json`](../vercel.json) defines a single cron → `GET /api/cron`, a dispatcher that runs every enabled job in one pass (currently `lead-follow-ups` + `cleanup`).
- Toggle a job with env: `CRON_LEAD_FOLLOWUPS` / `CRON_CLEANUP` = `off`/`false`/`0` (unset = on).
- **After upgrading** to a plan with multiple crons: add `/api/cron?job=<id>` entries on their own schedules and disable them from the run-all via env. No code change needed.

## 5. Post-deploy verification
- `GET /api/health` → `200 { ok: true, db: "up", version, time }` (and `503` if the DB is unreachable). Point an uptime monitor here.
- Log in as the seeded admin → create a shop → confirm the handoff card.
- If LINE is configured: confirm the webhook shows "Verified" in the LINE console and an OTP arrives.
- Trigger the cron once: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron`.

## 6. Backups & disaster recovery

> Verify the exact features/retention against your current Turso & Cloudflare plans — specifics differ
> by tier. The procedures below are the policy this project assumes.

### Database (Turso / libSQL)
- **Managed backups:** Turso keeps automatic backups / point-in-time restore on its platform — confirm
  the retention window for your plan and that it's enabled for the prod DB.
- **Own off-platform snapshot (recommended weekly):** dump the DB so a restore never depends solely on
  the provider:
  ```bash
  turso db shell <db-name> ".dump" > backup-$(date +%F).sql        # via Turso CLI
  # or, against the libsql URL, export with sqlite3 from a local replica
  ```
  Store dumps in a separate bucket/account (not the same R2 as the app data).
- **Restore drill (do once, before you need it):** create a scratch DB, import a dump
  (`turso db shell <scratch> < backup.sql`), point a preview deploy's `TURSO_DATABASE_URL` at it, smoke-test.
- **Targets:** RPO ≈ last daily backup (≤24h); RTO ≈ minutes (repoint env + redeploy). Tighten with
  point-in-time restore if the plan supports it.

### Object storage (Cloudflare R2)
- Enable **bucket versioning** (or a lifecycle rule keeping deleted/overwritten objects N days) so a bad
  delete/overwrite of a slip/image is recoverable.
- Slips and shop/lead images are **referenced by DB rows** — a DB restore must be paired with the
  matching R2 state, so keep their backup cadence aligned.

### Migrations (forward-only — there are no down-migrations)
- Migrations in `drizzle/` are append-only and auto-applied on the Vercel prod build
  (`scripts/vercel-migrate.mjs`). There is **no automatic rollback.**
- **To revert a bad migration:** ship a NEW migration that undoes it (`npm run db:generate` after editing
  the schema back), don't hand-edit history. For a destructive change, **take a fresh dump first** (above)
  so you can restore if the revert loses data.
- **Before a risky migration:** snapshot the DB, and prefer additive changes (new nullable columns/tables)
  over drops/renames — SQLite makes column drops painful and they can't be cleanly reverted.
