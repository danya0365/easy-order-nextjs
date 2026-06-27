# Forking this template into a new product

This is the **step-by-step runbook** for cloning the starter into a new Thai vertical SaaS (the next
product after Easy Stamp — e.g. "Easy Queue"). It turns the [REUSE_MAP](REUSE_MAP.md) matrix into an
ordered checklist with a concrete delete-manifest.

> Mental model: **keep the 🟢 generic half** (auth, billing, notifications, audit, rate-limit,
> storage, theming, i18n scaffold, ops, the Clean-Arch skeleton + DI core) and **replace the 🔴 domain
> half** (stamp cards / shops / customers / leads / reviews) with your product's nouns. The DI
> container is split so the domain repos live in one place (`container.domain.ts`) — see step 4.

---

## 0. Prep
- Copy the repo, set the new git remote, `npm install`.
- Pick the product's nouns up front (e.g. `Venue`, `QueueTicket`, `TicketStatus`). You'll model these
  in step 5 following [EXTENDING.md](EXTENDING.md).

## 1. Rebrand (config + assets)
- `src/config/brand.ts` — `name` / `tagline` / `description` / `totpIssuer` / `userAgent`. Single
  source; flows into metadata, layouts, TOTP, manifest, OTP/2FA/LINE copy.
- `package.json` — `"name"`.
- `public/icons/*` — replace `icon-192.png` / `icon-512.png` / `logo-mark.png` / `logo-wordmark.png`.
- `app/opengraph-image.alt.txt` + `app/twitter-image.alt.txt` — rewrite the social-card alt text.
- Theme colors: edit `public/styles/themes/{cafe,minimal,retro}.css` (or add a new theme file) — the
  token layer is `var()`-only, real hex lives in these files.

## 2. Rewrite the per-clone content pages
These are intentionally Thai prose, left for the clone (see the brand bullet in TEMPLATE_AUDIT):
`app/(public)/{tutorial,privacy,info}/page.tsx` and the new `app/(public)/tos/page.tsx`. Keep the
PDPA export/erase wiring; rewrite the copy.

## 3. Delete the domain (🔴) — delete-manifest
Delete these directories/files wholesale, then fix the imports the compiler flags (steps 4–5 replace
them). Keep everything NOT listed here.

**DB schema** (`src/infrastructure/db/schema/`) — delete:
`shops.ts` · `shop-categories.ts` · `shop-images.ts` · `shop-profiles.ts` · `shop-reviews.ts` ·
`branches.ts` · `customers.ts` · `customer-devices.ts` · `bind-codes.ts` · `stamp-cards.ts` ·
`stamp-types.ts` · `stamp-balances.ts` · `stamp-transactions.ts` · `reward-redemptions.ts` ·
`leads.ts` · `lead-visit-logs.ts`
**Keep (🟢):** `users.ts` · `sessions.ts` · `audit-logs.ts` · `notifications.ts` · `rate-limits.ts` ·
`subscriptions.ts` · `payments.ts` · `topup-transactions.ts` · `contact-requests.ts` · `_shared.ts` ·
`index.ts` (prune the deleted re-exports).

**Application use-cases** (`src/application/use-cases/`) — delete: `stamp/` · `shop/` · `member/` ·
`lead/` · `review/` · `customer/`. **Keep:** `auth/` · `billing/` · `contact/` · `line/` ·
`platform/` (rewrite metrics) · `maintenance/`.

**Repository interfaces** (`src/application/repositories/`) — delete the `I{Shop*,Branch,Customer*,
BindCode,Stamp*,RewardRedemption,Lead*,Analytics,PlatformAnalytics}Repository.ts`. **Keep** the
`I{User,Session,AuditLog,Notification,RateLimit,Subscription,Payment,TopupTransaction,ContactRequest}`
ones + `pagination.ts`.

**Drizzle repos** (`src/infrastructure/repositories/drizzle/`) — delete the matching `Drizzle*` impls
for the interfaces above.

**Presentation** — delete domain component dirs (`src/presentation/components/{stamp,shop,reviews,
leads,analytics}` + the domain parts of `admin`; `map` is generic mapping wired to shops — keep or
re-point) and domain actions (`{stamp,shop,lead,review}-actions.ts` + domain parts of
`admin-actions.ts`). **Keep:** `components/{ui,layout,auth,billing,channels,notification,pwa,settings}`
+ `ThemeSwitcher`; `{auth,billing,contact,line,notification,security}-actions.ts`.

**Routes** (`app/`) — replace `(shop)` / `(staff)` / `(public)` route *content* and the domain API
routes (`api/{shop-images,slips,lead-photos,geo}`); **keep** the group structure, `(auth)`,
`api/{health,cron,line,client-error}`.

**i18n** (`messages/th.json`) — delete the domain namespaces (`stamp`, `leads`, `map`, `reviews`,
`shop`, `promote`, `analytics`, `shopPages`, `adminPages` domain keys, etc.); keep `common`, `error`,
`auth`, `billing`, `layout`, `channels`, `theme`. Update `src/i18n/client-messages.ts` allowlist to
match.

## 4. Repoint the DI container
The container is split so this is a one-file change:
- `src/infrastructure/di/container.generic.ts` — the 🟢 core (don't touch). Holds user/session/auth/
  audit/notification/rate-limit/subscription/payment/topup/contact repos + all generic services
  (hasher, totp, breach-checker, payment-verifier, slip-storage, message-pusher, turnstile, geocoder,
  logger, notificationService, auditLogger, loginSecurity, sensitiveActionGuard).
- `src/infrastructure/di/container.ts` — extends the generic core with **domain** repos. Replace the
  domain repo fields here with your new product's repos. This is the only DI edit.

## 5. Model the new domain
Follow [EXTENDING.md](EXTENDING.md) per entity: schema → migration → entity → repo interface →
Drizzle repo → register in `container.ts` → use case → action → UI → tests. Reuse
billing/notifications/audit/auth/rate-limit as-is; adjust `platform`-analytics metrics and the tab-nav
config in `src/presentation/components/layout/AppTabBar.tsx` + `CustomerTabBar.tsx`.

## 6. Reset migrations + seed
Domain schema changed, so regenerate from scratch: delete `drizzle/*.sql` + the journal, run
`npm run db:generate`, point at a fresh local DB, `db:push`. Rewrite `scripts/seed/*` for the new
domain. (Migrations target **prod** Turso by default — override env for local; see
[the drizzle-kit note](DEPLOYMENT.md).)

## 7. Per-clone config
- `.env.example` → `.env.local`: keep the 🟢 groups (Turso, session, R2, LINE, Turnstile, cron, log,
  error-webhook, email); set `PROMPTPAY_TARGET` if you keep slip billing.
- Roles: `src/domain/types/roles.ts` — rename `shop_owner`/`branch_staff` to the product's roles;
  update `ROLE_HOME`, `ROLE_LABEL_KEY`, and the `common.role*` messages.

## 8. Verify (must be green before first deploy)
`npx tsc --noEmit` · `npm run lint:all` · `npm test` · `npx next build`. Then work the
[TEMPLATE_AUDIT.md](TEMPLATE_AUDIT.md) boxes you skipped and follow [DEPLOYMENT.md](DEPLOYMENT.md).
