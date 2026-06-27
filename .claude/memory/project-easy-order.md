---
name: project-easy-order
description: "Easy Order — new in-store iPad self-ordering SaaS cloned from easy-stamp; what it is, where it lives, key design decisions"
metadata: 
  node_type: memory
  type: project
  originSessionId: 283a20fe-3754-423f-b973-53043e4451d9
---

**Easy Order** = product #2, a NEW project at `/Users/marosdeeuma/easy-order-nextjs` (sibling of easy-stamp-nextjs), created 2026-06-27 by cloning the [[saas-starter-roadmap]] starter (easy-stamp v1.19.0) and swapping the loyalty-stamp domain for **in-store self-ordering**. Local git only (`main`); owner creates the GitHub remote (gh not authed in this env).

**What it does:** shop puts an iPad at the counter in **kiosk mode**; anonymous walk-in customers tap to browse menu → cart → checkout (PromptPay QR or cash) → get a queue number. Shop watches a live order queue (pending→preparing→ready→completed/cancelled) + confirms payment manually. Customers are read-only, no login. "Easy" is the product principle.

**Key design decisions (confirmed with user):**
- Tenant stays `Shop`(+`Branch`); all generic core reused as-is (auth/billing day-topup+PromptPay slip/notifications/audit/rate-limit/contact/ops/i18n/theme + `container.generic.ts`).
- Kiosk lock = **dedicated kiosk PIN** (4–6 digits), NOT the owner's full session. DB-backed `kiosk_sessions` table → `eo_kiosk` httpOnly cookie → `requireKioskShop()` guard (`src/infrastructure/auth/kiosk.ts`). Orders derive shopId from this server-validated session ONLY, so remote/forged orders are impossible. Exit kiosk needs the PIN.
- Menu = `MenuCategory` + `MenuItem` (price in satang). Order = `Order`+`OrderItem` with **name/price snapshots** (menu edits don't rewrite history) + per-shop **daily order number**.
- QR payment = shop **manually confirms** receipt (no gateway/slip). PromptPay QR rendered from `shop.promptpayTarget` via reused `renderPromptPayQR`.
- PlaceOrder reads prices from the DB (never client) + checks availability + tenant; rate-limited via `sensitiveActionGuard`; fires a `new_order` notification.

**Layout:** order domain in `src/{domain/entities,application/{repositories,use-cases/{menu,order,kiosk}},infrastructure/repositories/drizzle}`; actions `menu-actions/order-actions/kiosk-actions.ts`; UI `app/(shop)/shop/{menu,orders}` + `app/(kiosk)/` + components under `components/{menu,order,kiosk}`. DI domain repos registered in `container.ts`. 16-table migration baseline `drizzle/0000_init.sql`.

**Run locally:** `TURSO_DATABASE_URL="file:./local.db" npm run db:migrate && ... npm run db:seed` then `npm run dev`. Demo: login `owner@diner-a.test`/`password123` → /shop/settings → kiosk PIN already `1234` + demo menu + PromptPay set → activate kiosk → /kiosk. drizzle-kit still targets PROD by default (override env inline) — see [[drizzle-kit-targets-prod]].

**Status:** v0.1.0, full vertical slice shipped, gate green (tsc 0 / lint 0 / 133 tests / build OK). Same verification gate + conventions as easy-stamp (BRAND.*, theme tokens, next-intl `th`, Clean Arch enforced by dependency-cruiser).
