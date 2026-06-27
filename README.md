# Easy Order

A multi-tenant **in-store self-ordering SaaS** for merchants. The shop puts an **iPad/tablet at the counter** in *kiosk mode*; walk-in customers tap to **browse the menu, build a cart, and place an order**, paying by **PromptPay QR or cash**. Customers are **anonymous and read-only** — no app, no login. Orders can only be placed on a device the shop has activated (a DB-backed kiosk session), so nobody can fire fake orders remotely. Each shop pays as it goes by **topping up usage days** via PromptPay; the platform admin verifies slips manually. The UI is in Thai.

> Built by cloning the **Easy Stamp** SaaS starter — the generic half (auth, billing, multi-tenant, notifications, audit, ops, theming, i18n) is reused as-is; the domain is in-store ordering. See [docs/FORKING.md](docs/FORKING.md).

## Features

**Customer kiosk (no login)**
- Full-screen ordering surface on the shop's device: category browse → cart → checkout (PromptPay QR / cash) → a big **queue number** to call the order.
- Orders are scoped to the shop from a **server-validated kiosk session** (an `eo_kiosk` httpOnly cookie backed by a `kiosk_sessions` row) — a forged cookie or an off-site request cannot place an order.
- Item names and prices are read from the shop's own menu at order time (never trusted from the client), so a tampered payload can't change the total.

**Shop**
- **Menu management**: categories + items (name, price, description, availability toggle).
- **Live order queue**: status flow `pending → preparing → ready → completed` (or cancel), confirm-payment, auto-refresh, plus a paginated history.
- **Kiosk control**: set a numeric **PIN** (required to exit kiosk mode on a device) and activate the current device as a kiosk.
- **Multi-tenant + branches**, three roles `platform_admin` / `shop_owner` / `branch_staff` (custom session auth, shop-scoped access).

**Billing**
- Per-shop **prepaid "day top-up"**: buy usage days, pay via **PromptPay QR + slip upload**; admin verifies and credits days (recorded in a `topup_transactions` ledger). Validity is a **paid-through date**; once it passes the shop auto-suspends (derived, no cron).

## Tech stack

- **Next.js 16** (App Router) — async `params`/`searchParams`/`cookies()`/`headers()`, `proxy.ts` (not `middleware.ts`), Turbopack. Read `node_modules/next/dist/docs/` before relying on older Next conventions.
- **React 19**
- **Turso / libSQL + Drizzle ORM** (`dialect: "turso"`, `snake_case` casing)
- **Custom session auth** — bcryptjs + httpOnly cookie + a `sessions` table
- **Tailwind v4** multi-theme — semantic CSS tokens in `public/styles/`, runtime theme switch (cafe / minimal / retro + dark)
- zod · react-hook-form · zustand · qrcode (PromptPay EMVCo payload)

## Architecture

Clean Architecture layering:

| Layer | Path | Holds |
| --- | --- | --- |
| Routing / UI entry | `app/` | App Router pages, route handlers, layouts (incl. the `(kiosk)` group) |
| Domain | `src/domain/` | Entities + pure services (billing state, PromptPay, phone) |
| Application | `src/application/` | Repository interfaces + use cases (menu, order, kiosk, billing, auth) |
| Infrastructure | `src/infrastructure/` | Drizzle repositories, auth (session + kiosk), services, DI container |
| Presentation | `src/presentation/` | Components, stores, Server Actions |

Deliberate (approved) deviations from the base init SKILL: **Turso instead of Supabase**, `Drizzle*Repository` implementations, **Server Actions** instead of an HTTP `Api*Repository` layer, and the `@/src/...` import alias.

## Documentation

| Doc | What |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layering diagram + enforced rules |
| [docs/EXTENDING.md](docs/EXTENDING.md) | How to add an entity / repo / use case / action |
| [docs/REUSE_MAP.md](docs/REUSE_MAP.md) | Generic vs domain — what to keep/rewrite when forking |
| [docs/FORKING.md](docs/FORKING.md) | Step-by-step clone runbook (this app was made with it) |
| [docs/TESTING.md](docs/TESTING.md) | Test runner, in-memory DB, helpers, e2e |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel / Turso / R2 / LINE setup + env + cron |
| [VERSIONING.md](VERSIONING.md) | SemVer + release flow |

## Getting started

**Prerequisites:** Node.js 20+. Local dev uses a SQLite file (`file:./local.db`) — no Turso account needed.

```bash
npm install
TURSO_DATABASE_URL="file:./local.db" npm run db:migrate   # create tables locally
TURSO_DATABASE_URL="file:./local.db" npm run db:seed      # demo data (logins below)
npm run dev                                               # http://localhost:3000
```

> `db:migrate`/`db:push` target the **remote prod** Turso by default (they load `.env.production.local`). For local work, override `TURSO_DATABASE_URL` inline as shown.

**Try the kiosk:** log in as the active mock shop owner (`owner@diner-a.test` / `password123`) → **/shop/settings** → it already has a kiosk PIN (`1234`) + a demo menu + PromptPay set → **เปิดโหมดหน้าร้านบนเครื่องนี้** to enter `/kiosk` and place an order. Watch it land in **/shop/orders**. Exit kiosk with PIN `1234`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint:all` | ESLint + stylelint + dependency-cruiser |
| `npm test` | Integration + unit tests (node:test, in-memory libSQL) |
| `npm run db:generate` | Generate Drizzle migrations from the schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data (admin + shops + demo menu/kiosk) |
| `npm run scaffold <Name>` | Scaffold a new entity's repo/use-case boilerplate |

## Seed logins

All seeded users share the password **`password123`**:

| Email | Role |
| --- | --- |
| `admin@easystamp.test` | platform admin |
| `owner@diner-a.test` | shop owner (active — demo menu + kiosk PIN `1234`) |
| `owner@bakery-b.test` | shop owner (overdue / suspended demo) |
| `staff1@diner-a.test` | branch staff |

## Notes

- Money is stored as integer satang; IDs are nanoid text; timestamps are ISO strings.
- The kiosk runs anonymously on the shop's device; QR payment is **manually confirmed** by staff (no gateway). Test the kiosk touch flow on a real tablet.
