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

**Kiosk auth nuance (clarified with user):** putting a device into kiosk mode (**activation**) needs the owner logged in (`requireShopWrite`, `activateKioskAction`); but each kiosk **order** is placed by the device session (`requireKioskShop` cookie), NOT a live user — the *customer* self-serves. So kiosk = customer self-serve on a shop-authorized device, NOT "staff orders for the customer". The latter is the separate order-entry screen below.

**Built this session (2026-06-27) — all verified by actually running the app, gate green:**
- **Menu item images — ✅** (`e22b661`): upload via the existing R2 slip storage + `ImageCropField`; `SetMenuItemImageUseCase` stores `menu/{itemId}`, served by public `app/api/menu/[itemId]/image`; rendered on kiosk + shop menu. Also fixed a latent orphan-cron bug (menu keys weren't passed as referenced → would delete all menu images).
- **Customer identity + self-service history — ✅** (Phase 1 `101608e`, Phase 2 `2149629`): optional name+phone at order → per-shop `Customer` {phone, displayName, publicCode} linked to orders (snapshots on the order); customer scans a one-time **bind-code QR** shown on the kiosk/POS result → device cookie (`eo_member_<slug>`, no login) → views order history at `/s/[slug]` + `/me`. Ported from Easy Stamp (stamps→orders). New tables `customers`/`customer_devices`/`bind_codes`; use-cases in `application/use-cases/member/`. Security: a phone alone never reveals history (valid single-use code required).
- **Staff/owner order-entry (POS) — ✅** (`6045234`): "place an order for a customer" screen (like Easy Stamp's add-stamp station). `operatorContext()` guard allows **branch_staff** (own shop) OR owner/impersonating admin. `placeOrderForCustomerAction` + `StaffOrderEntry` (searchable customer picker + add-new + walk-in, menu/cart, payment, result QR + history bind-QR). Pages: `/staff` (replaced the stub) + `/shop/new-order`; AppTabBar "เปิดออเดอร์" tab. `order` schema unchanged (no `performedBy` yet — note for staff accountability).

- **Public homepage map + `/shops` directory — ✅** (`ad83770`): re-ported the discovery surface that the clone dropped. Homepage `/` renders a maplibre map (client-only via `next/dynamic` ssr:false, lazy) pinning active branches through the already-present `branchRepository.listMapLocations()`; marker popups link to `/s/[slug]`. `/shops` is a plain alphabetical directory of active shops — **simplified**: Easy Order has no reviews/categories/profile-images, so no `StarRating`/rating/filter chips (unlike Easy Stamp's version). `maplibre-gl`/`react-map-gl` deps were already installed (dangling) → now used; next.config CSP/Permissions-Policy already allowed maplibre+geolocation. New `src/presentation/components/map/` (StoreMap/StoreMapView/MapLoading/osm-style). Restored Map/Shops tabs in `CustomerTabBar`; added `map` to the client-messages allowlist; fixed the stale stamp `publicPages.tagline`. The two previously-orphaned `tests/e2e/smoke.spec.ts` tests (homepage map / shop directory) now PASS. Verified live with Playwright (canvas mounts, 7 markers, popup→/s/<slug>, /shops lists shops).

**✅ DONE — re-ported ALL generic features the clone dropped** (user was upset I'd deleted the `reviews`/`promote`/`leads`/`analytics` i18n in the stamp-cleanup: those features were dropped at clone time and SHOULD exist; only orphan i18n lingered). 7-phase port (Easy Stamp → adapt to ordering → migration/DI/i18n → gate + run-the-app → commit; plan file `~/.claude/plans/summary-ancient-pebble.md`):
- P1 shop categories (`e9710a9`) — + `/shops` filter chips + category in map popup
- P2 shop images profile/cover/gallery (`2928edd`) — `/api/shop-images`, shown in /shops + map popup + /s hero
- P3 /shop/customers + PDPA export/erase (`099a7e6`)
- P4 reviews + re-enabled star ratings in map/directory (`f48d6e3`)
- P5 analytics — recharts shop+platform dashboards, **metrics = orders/revenue** not stamps (`b206cfb`)
- P6 promote — poster studio reframed to ordering (free-text highlight + QR to /s/[slug], NO reward/threshold; AI panel = copy-to-clipboard, no LLM), PNG export verified (`5ea1cc7`)
- P7 leads — admin shop-acquisition CRM + OsmGeocoder + /api/geo/* + /api/lead-photos + map picker + ConvertLeadToShop (added optional `categoryId` to CreateShopUseCase) (`f9c828a`)
All needed npm deps (recharts/html-to-image/maplibre/qrcode/dayjs/browser-image-compression) + the geocoder DI registration were already in the repo (dangling from clone) → now used. Migrations through `0006`. 145 tests. **Note: platform_admin pages (reviews/analytics/leads admin) sit behind a pre-existing mandatory-2FA wall — admin-only UI verified at build/render level + domain via integration tests; non-admin flows Playwright-verified live.**

**⏳ STILL PENDING:** nothing from the port. Possible follow-ups (not requested): `performedBy`/audit on orders for staff accountability; swap OSM community tiles for a real provider before heavy production load; optionally wire lead follow-up reminders (`ListDueFollowUpsUseCase`) into the `/api/cron` dispatcher.

**Genuinely out of scope** (the earlier "anonymous only / accounts out of scope / directory out of scope" notes were WRONG — a clone miss + bad handoff): full customer account/password, payment gateway/auto-verify, multi-locale, and **placing orders from off-site** (orders must come from an activated kiosk or a logged-in operator).

**Layout:** order domain in `src/{domain/entities,application/{repositories,use-cases/{menu,order,kiosk}},infrastructure/repositories/drizzle}`; actions `menu-actions/order-actions/kiosk-actions.ts`; UI `app/(shop)/shop/{menu,orders}` + `app/(kiosk)/` + components under `components/{menu,order,kiosk}`. DI domain repos registered in `container.ts`. 16-table migration baseline `drizzle/0000_init.sql`.

**Run locally (fresh clone gotcha — a fresh `local.db` is EMPTY → every page throws `no such table`):** `cp .env.example .env.local`, then `TURSO_DATABASE_URL="file:./local.db" npm run db:migrate && TURSO_DATABASE_URL="file:./local.db" npm run db:seed`, then `npm run dev`. Demo: login `owner@diner-a.test`/`password123` (or staff `staff1@diner-a.test`); shop seed has kiosk PIN `1234` + demo menu + PromptPay. drizzle-kit targets PROD by default — override `TURSO_DATABASE_URL` inline — see [[drizzle-kit-targets-prod]]. Without R2 env, uploads use `LocalSlipStorage` → `./uploads/`.

**Verification gate:** `npx tsc --noEmit` · `npm run lint:all` · `npm test` · `npx next build`. ⚠️ `npm test` is the node unit/integration suite ONLY — Playwright e2e is `npm run test:e2e` (separate, boots its own `.e2e.db`), so a green `npm test` does NOT prove the app renders. The `order.integration.test.ts` suite is occasionally flaky (1 fail) from shared-DB timing — re-run to confirm.

**Status:** migrations through `0002` (added customers/devices/bind-codes + order customer cols); ~143 tests; gate green. Conventions unchanged (BRAND.*, theme tokens, next-intl `th`, Clean Arch enforced by dependency-cruiser). See [[verify-by-running-the-app]].
