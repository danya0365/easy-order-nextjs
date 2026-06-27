# Easy Stamp

A multi-tenant **stamp-card loyalty SaaS** for merchants running several shops and branches. Customers earn stamps on each purchase, reach a per-stamp-type threshold (default 10), and redeem a free reward — **no app install and no customer login required**. Each shop pays as it goes by **topping up usage days** via PromptPay; the platform admin verifies slips manually. The UI is in Thai.

> There is an in-app, human-readable overview of the product at **`/info`** (for both shop owners and customers).

## Features (Phase 1)

**Customer stamp flow (no login)**
- Identity is a **device-bound secret token** set by scanning the shop's one-time QR — not a phone-number login, so others can't impersonate a customer.
- Returning customers just re-scan the shop QR to reopen their card (cookie persists 1 year). Switching devices → re-bind at the shop.
- **"My Cards" page (`/me`)** aggregates every shop bound on the device, with a single installable PWA icon.

**Staff & shops**
- Staff add stamps and redeem rewards from a counter screen; **scan the customer's QR** instead of typing a phone every time.
- Every add/redeem is recorded in a ledger.
- **Multi-tenant + branches**: many shops, each with its own branches, staff, threshold, and reward text.
- **Three roles**: `platform_admin`, `shop_owner`, `branch_staff` (custom session auth, scoped access).

**Billing**
- Per-shop **prepaid "day top-up"**: the shop buys usage days (preset packages priced from its per-day rate, or a custom number of days) and pays via **PromptPay QR + slip upload**; admin verifies and credits the days. Every credit is recorded in a `topup_transactions` ledger.
- Validity is tracked as a **paid-through date**; once it passes the shop is **automatically suspended** — derived from the due date, no cron.
- Payment verification sits behind an `IPaymentVerifier` interface (`ManualSlipPaymentVerifier` today) so an auto-verify provider can be swapped in later.

## Tech stack

- **Next.js 16** (App Router) — async `params`/`searchParams`/`cookies()`/`headers()`, `proxy.ts` (not `middleware.ts`), Turbopack. Read `node_modules/next/dist/docs/` before relying on older Next conventions.
- **React 19**
- **Turso / libSQL + Drizzle ORM** (`dialect: "turso"`, `snake_case` casing)
- **Custom session auth** — bcryptjs + httpOnly cookie + a `sessions` table
- **Tailwind v4** multi-theme — semantic CSS tokens in `public/styles/`, runtime theme switch (cafe / minimal / retro + dark) via Zustand + ThemeProvider
- zod · react-hook-form · zustand · qrcode (PromptPay EMVCo payload) · qr-scanner (in-browser camera)

## Architecture

Clean Architecture layering:

| Layer | Path | Holds |
| --- | --- | --- |
| Routing / UI entry | `app/` | App Router pages, route handlers, layouts |
| Domain | `src/domain/` | Entities + pure services (card view, billing state, phone, PromptPay) |
| Application | `src/application/` | Repository interfaces + use cases |
| Infrastructure | `src/infrastructure/` | Drizzle repositories, auth, services, DI container |
| Presentation | `src/presentation/` | Components, stores, presenters, Server Actions |

Deliberate (approved) deviations from the base init SKILL: **Turso instead of Supabase**, `Drizzle*Repository` implementations, **Server Actions** instead of an HTTP `Api*Repository` layer, and the `@/src/...` import alias.

## Documentation

| Doc | What |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layering diagram + enforced rules |
| [docs/EXTENDING.md](docs/EXTENDING.md) | How to add an entity / repo / use case / action |
| [docs/REUSE_MAP.md](docs/REUSE_MAP.md) | Generic vs domain — what to keep/rewrite when forking |
| [docs/FORKING.md](docs/FORKING.md) | Step-by-step clone runbook + delete-manifest (new product) |
| [docs/TESTING.md](docs/TESTING.md) | Test runner, in-memory DB, helpers, e2e |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel / Turso / R2 / LINE setup + env + cron |
| [docs/TEMPLATE_AUDIT.md](docs/TEMPLATE_AUDIT.md) | Template-readiness audit + P0/P1/P2 roadmap |
| [VERSIONING.md](VERSIONING.md) | SemVer + release flow |

## Getting started

**Prerequisites:** Node.js 20+. For local dev the database defaults to a SQLite file (`file:./local.db`) — no Turso account needed. For production, create a Turso database.

**Environment variables** (`.env.local`):

```bash
# Database — omit both for local file DB (file:./local.db)
TURSO_DATABASE_URL=libsql://<your-db>.turso.io
TURSO_AUTH_TOKEN=<your-token>

# Absolute base URL used to build QR / bind links (defaults to the request host)
APP_URL=https://your-domain.example
```

**Install and run:**

```bash
npm install
npm run db:push     # create tables in the DB
npm run db:seed     # seed reference + demo data (see logins below)
npm run dev         # http://localhost:3000
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations from the schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push the schema straight to the DB (dev) |
| `npm run db:seed` | Seed everything: reference + starter + mock data |
| `npm run db:seed:core` | Seed only reference + starter data (no mock) |

## Seed logins

All seeded users share the password **`password123`**:

| Email | Role |
| --- | --- |
| `admin@easystamp.test` | platform admin |
| `owner@coffee-a.test` | shop owner (active shop) |
| `owner@bakery-b.test` | shop owner (overdue / suspended demo) |
| `staff1@coffee-a.test` | branch staff |

Public / customer routes need no login: `/s/<shop-slug>` (a shop's card), `/me` (all cards on the device), `/info` (product overview).

> `/preview` is a **dev-only** design-system showcase — remove it before production.

## Notes

- **Customers have no login by design** — identity is the device-bound token, so camera-scan binding and PWA install must be **tested on a real mobile device** (they can't be verified headless).
- Money is stored as integer satang; IDs are nanoid text; timestamps are ISO strings.
