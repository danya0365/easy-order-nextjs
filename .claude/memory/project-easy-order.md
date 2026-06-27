---
name: project-easy-order
description: "Easy Order — new in-store iPad self-ordering SaaS cloned from easy-stamp; what it is, where it lives, key design decisions"
metadata: 
  node_type: memory
  type: project
  originSessionId: 283a20fe-3754-423f-b973-53043e4451d9
---

**Easy Order** = product #2, a NEW project at `/Users/marosdeeuma/easy-order-nextjs` (sibling of easy-stamp-nextjs), created 2026-06-27 by cloning the [[saas-starter-roadmap]] starter (easy-stamp v1.19.0) and swapping the loyalty-stamp domain for **in-store self-ordering**. Local git only (`main`); owner creates the GitHub remote (gh not authed in this env).

**What it does:** shop puts an iPad at the counter in **kiosk mode**; walk-in customers tap to browse menu → cart → checkout (PromptPay QR or cash) → get a queue number. Shop watches a live order queue (pending→preparing→ready→completed/cancelled) + confirms payment manually. Customers order with **no login**; optionally they enter **name + phone** so the order ties to a per-shop `Customer` and builds **order history** they can view on their own phone (one-time bind-code QR → httpOnly cookie). "Easy" = the product principle (no full account/password).

**Key design decisions (confirmed with user):**
- Tenant stays `Shop`(+`Branch`); all generic core reused as-is (auth/billing day-topup+PromptPay slip/notifications/audit/rate-limit/contact/ops/i18n/theme + `container.generic.ts`).
- Kiosk lock = **dedicated kiosk PIN** (4–6 digits), NOT the owner's full session. DB-backed `kiosk_sessions` table → `eo_kiosk` httpOnly cookie → `requireKioskShop()` guard (`src/infrastructure/auth/kiosk.ts`). Orders derive shopId from this server-validated session ONLY, so remote/forged orders are impossible. Exit kiosk needs the PIN.
- Menu = `MenuCategory` + `MenuItem` (price in satang). Order = `Order`+`OrderItem` with **name/price snapshots** (menu edits don't rewrite history) + per-shop **daily order number**.
- QR payment = shop **manually confirms** receipt (no gateway/slip). PromptPay QR rendered from `shop.promptpayTarget` via reused `renderPromptPayQR`.
- PlaceOrder reads prices from the DB (never client) + checks availability + tenant; rate-limited via `sensitiveActionGuard`; fires a `new_order` notification.

**⚠️ Scope correction (2026-06-27):** earlier notes that called customers "anonymous only / no customer accounts" and the shop **map/directory** "out of scope" were WRONG (a clone miss + a bad handoff). The TRUE scope — confirmed with the user, **in scope but NOT yet built (planned)**:
- **Customer identity + self-service history:** optional name+phone at order → per-shop `Customer` {phone, displayName, publicCode} linked to orders; customer scans a one-time **bind-code QR** at the kiosk → device cookie (`eo_member_<slug>`, no login) → views their order history at `/s/[slug]` + `/me`. Port/adapt Easy Stamp's customer model (stamps→orders). **Build this FIRST.**
- **Public homepage map + `/shops` directory:** Easy Stamp's generic shop map + directory were dropped by mistake during the clone (deps `maplibre-gl`/`react-map-gl`, `branchRepository.listMapLocations()`, i18n, and the `tests/e2e/smoke.spec.ts` assertions were all left dangling/failing). Re-point to Easy Order. **Build this AFTER the customer feature.** (`npm run test:e2e` is separate from `npm test` — that's why the failing map tests were missed.)
- Genuinely out of scope: full customer account/password, payment gateway/auto-verify, multi-locale, and **placing orders from off-site** (orders must come from an activated kiosk).

**Layout:** order domain in `src/{domain/entities,application/{repositories,use-cases/{menu,order,kiosk}},infrastructure/repositories/drizzle}`; actions `menu-actions/order-actions/kiosk-actions.ts`; UI `app/(shop)/shop/{menu,orders}` + `app/(kiosk)/` + components under `components/{menu,order,kiosk}`. DI domain repos registered in `container.ts`. 16-table migration baseline `drizzle/0000_init.sql`.

**Run locally:** `TURSO_DATABASE_URL="file:./local.db" npm run db:migrate && ... npm run db:seed` then `npm run dev`. Demo: login `owner@diner-a.test`/`password123` → /shop/settings → kiosk PIN already `1234` + demo menu + PromptPay set → activate kiosk → /kiosk. drizzle-kit still targets PROD by default (override env inline) — see [[drizzle-kit-targets-prod]].

**Status:** v0.1.0, full vertical slice shipped, gate green (tsc 0 / lint 0 / 133 tests / build OK). Same verification gate + conventions as easy-stamp (BRAND.*, theme tokens, next-intl `th`, Clean Arch enforced by dependency-cruiser).
