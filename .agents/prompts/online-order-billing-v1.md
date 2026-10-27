# Easy Order V1: Online ordering + billing platform switches

Work in `/workspace/easy-order-cf` on branch `feat/online-order-fulfillment`.
Follow clean architecture already used in this repo. Keep kiosk + counter working.
Do NOT fork Easy Stamp. Thai error messages. Do not print secrets.

## PART A — Online remote ordering + fulfillment

### A1. Schema (drizzle, snake_case via casing)
Edit `src/infrastructure/db/schema/shops.ts` add:
- `onlineOrderingEnabled` integer boolean NOT NULL default false
- `pickupEnabled` integer boolean NOT NULL default true
- `deliveryEnabled` integer boolean NOT NULL default false
- `deliveryFeeSatang` integer NOT NULL default 0
- `deliveryNotes` text nullable
- `minOrderSatang` integer nullable

Edit `src/infrastructure/db/schema/orders.ts` add:
- `channel` text enum `kiosk` | `counter` | `online` NOT NULL default `kiosk`
- `fulfillmentType` text enum `pickup` | `delivery` | `dine_in` NOT NULL default `pickup`
- `deliveryAddress` text nullable
- Update comment: orders are no longer kiosk-only

Also add ORDER_CHANNELS and ORDER_FULFILLMENT_TYPES const arrays like existing enums.

Run `npm run db:generate` to create migration SQL + journal snapshot. Do not invent journal by hand if drizzle-kit works.

### A2. Domain entities
Update `Shop` and `Order` in `src/domain/entities/index.ts` with the new fields.
Export types: `OrderChannel = "kiosk" | "counter" | "online"`, `FulfillmentType = "pickup" | "delivery" | "dine_in"`.

### A3. Repositories
- `IShopRepository.UpdateShopSettingsInput` + `DrizzleShopRepository.toShop` + `updateSettings` — persist new shop fields.
- `IOrderRepository.CreateOrderInput` + `DrizzleOrderRepository.create` + `toOrder` — persist channel, fulfillmentType, deliveryAddress; when creating, `totalSatang = subtotalSatang + deliveryFeeSatang` where deliveryFee comes from input (default 0). Add optional `deliveryFeeSatang?: number` on CreateOrderInput (applied only for delivery; 0 otherwise). Store subtotal as items sum; total = subtotal + fee.

### A4. PlaceOrderUseCase
Extend `PlaceOrderInput`:
- `channel?: OrderChannel` (default `kiosk` for back-compat)
- `fulfillmentType?: FulfillmentType` (default `pickup`)
- `deliveryAddress?: string | null`

Inject `IShopRepository` as 4th constructor dep (update all call sites + tests).

Guards when `channel === "online"`:
1. Shop must have `onlineOrderingEnabled` else throw `"ร้านนี้ยังไม่เปิดรับออเดอร์ออนไลน์"`
2. If fulfillment `pickup` → require `pickupEnabled` else throw Thai error
3. If fulfillment `delivery` → require `deliveryEnabled`; require non-empty trimmed address (max 300); else throw
4. If `delivery` → add shop.deliveryFeeSatang to total via CreateOrderInput
5. If shop.minOrderSatang set and subtotal < min → throw Thai error with amount
6. Online orders: `performedBy` must be null
7. Prefer requiring customerName + customerPhone for online (throw if missing)

When channel is kiosk/counter: keep existing behavior; set channel correctly from callers; fulfillment default pickup (or dine_in for kiosk if you prefer — pickup is fine).

Pass channel/fulfillment/deliveryAddress/deliveryFeeSatang into `orders.create`.

### A5. Actions
- `placeOrderAction` (kiosk): pass `channel: "kiosk"`, `fulfillmentType: "pickup"`
- `placeOrderForCustomerAction` (counter): pass `channel: "counter"`, `fulfillmentType: "pickup"`
- Add `placeOnlineOrderAction` in `order-actions.ts` (or new `online-order-actions.ts`):
  - Input: slug, cart, paymentMethod, note, customerName, customerPhone, fulfillmentType, deliveryAddress?
  - Resolve shop by slug; assertShopActive; rate-limit key `order_online:${shopId}:${ip}`
  - PlaceOrderUseCase with channel online, performedBy null
  - notifyShopOwner like kiosk
  - return PlaceOrderResult

### A6. Public UI
- Add `app/(public)/s/[slug]/order/page.tsx` + client component e.g. `OnlineOrdering.tsx` under `src/presentation/components/order/` or `online/`.
  - Load shop by slug; if !onlineOrderingEnabled → friendly Thai message / notFound or disabled state
  - Reuse GetKioskMenuUseCase for menu
  - Cart UI (can simplify from KioskOrdering — categories, +/- qty, checkout panel)
  - Fulfillment picker: only show pickup if pickupEnabled, delivery if deliveryEnabled
  - Name, phone required; address textarea if delivery; show delivery fee + min order note
  - Payment: cash and/or promptpay_qr if shop has promptpayTarget
  - On success show orderNo + status pending
- On `app/(public)/s/[slug]/page.tsx`: if shop.onlineOrderingEnabled, show CTA Link to `/s/${slug}/order` (Thai: "สั่งออนไลน์")

### A7. Settings UI
Extend `UpdateShopSettingsUseCase` + `updateSettingsAction` + `SettingsForm` with toggles (Thai labels):
- เปิดรับออเดอร์ออนไลน์
- รับเข้ารับที่ร้าน (pickup)
- บริการส่งโดยร้าน (delivery)
- ค่าส่ง (บาท → convert to satang)
- หมายเหตุการส่ง
- ยอดขั้นต่ำ (บาท, empty = null)

Pass current values from settings page.

### A8. Staff queue
In `OrderQueue` OrderCard (+ history rows): show badges for channel (คiosk/เคาน์เตอร์/ออนไลน์) and fulfillment (รับเอง/ส่ง/ทานที่ร้าน). Add i18n keys in messages/th.json and en.json under `order`.

### A9. Tests
Extend `order.integration.test.ts`:
- online disabled → rejects
- delivery without address → rejects
- delivery with fee → total includes fee
- online + pickup when pickup disabled → rejects
- kiosk path still works (channel kiosk default)

Update PlaceOrderUseCase constructor call sites in tests to pass shopRepository.

---

## PART B — Platform billing switches

### B1. Schema
New table `platform_settings` (single-row pattern, id fixed `"default"`):
- `id` text PK default/always `"default"`
- `billingUiEnabled` bool NOT NULL default true
- `orderThresholdBillingEnabled` bool NOT NULL default false
- `orderThresholdCount` int NOT NULL default 50
- `updatedAt`

Seed/insert default row in migration SQL: `INSERT OR IGNORE INTO platform_settings (id, billing_ui_enabled, order_threshold_billing_enabled, order_threshold_count) VALUES ('default', 1, 0, 50);`

### B2. Domain + repo
- Entity `PlatformSettings`
- `IPlatformSettingsRepository`: get(), update(partial)
- Drizzle implementation; register on container

### B3. Billing logic
Update `GetBillingStateUseCase` (preferred central place):
1. Load platform settings
2. If `!billingUiEnabled`: return status that is always active for overdue purposes — `isSuspended` only if shop.status === suspended_by_admin; bannerLevel=0; preExpiryBannerLevel=0; state active (or suspended for admin). Do NOT suspend for overdue when billing UI off.
3. If `orderThresholdBillingEnabled`: count lifetime orders for shop (add `IOrderRepository.countByShop(shopId)`). If count < orderThresholdCount: treat like active trial — no overdue suspension, no dunning banners (bannerLevel=0, preExpiry=0), isSuspended only for admin suspend. Keep prepaid days model unchanged in DB; just don't enforce/dunn until threshold met.
4. Else: existing computeBillingState behavior.

Also expose `billingUiEnabled` on BillingState return (or separate getter) so UI can hide chrome.

Update `assertShopActive` / layouts: when billingUiEnabled false, never redirect to /shop/billing for overdue.

### B4. UI hide when billingUiEnabled=false
- Shop/staff layouts: skip SuspensionBanner, PreExpiryBanner (and billing redirect) when !billingUiEnabled. Keep PausedBanner (pause is operational, not payment).
- Hide nav links to `/shop/billing` in AppTabBar / settings links when off
- `/shop/billing` page: if !billingUiEnabled show simple "ระบบคิดค่าบริการปิดอยู่" and no TopupForm
- Admin payments page: soft-hide or banner that billing UI is off (still allow verify if needed, or hide — prefer show notice + hide top-up marketing)
- Marketing copy that pushes top-up: skip obvious CTAs when off

### B5. Admin UI
Add `app/(platform)/admin/settings/page.tsx` (platform_admin only via existing require):
- Form toggles: แสดง UI ค่าบริการรายเดือน (billingUiEnabled), เปิดคิดเงินแบบถึงเกณฑ์ออเดอร์ (orderThresholdBillingEnabled), จำนวนออเดอร์เกณฑ์ (orderThresholdCount)
- Server action in admin-actions.ts

### B6. Tests
- Unit/integration: billingUiEnabled false → overdue shop not isSuspended (unless admin)
- Threshold on + order count < N → active/no dunning; count >= N → normal computeBillingState
- subscription-status pure function can stay; test via GetBillingStateUseCase with fakes or integration DB

---

## Constraints
- Do not deploy. Do not touch production Worker.
- Do not force-push. Commit locally with clear messages when feature compiles.
- Keep vinext files (cloudflare.config*.ts, vite.config.ts, package.json scripts) intact — they are WIP for deploy.
- Prefer minimal elegant diffs matching existing style (server actions, use-cases, drizzle repos).
- After code changes: run `npm run db:generate` then relevant tests `npm test -- order` / billing if feasible.

## Done criteria for this coding session
1. Migration file(s) generated for shops/orders/platform_settings columns
2. Online order path + settings + queue badges implemented
3. Billing platform flags + GetBillingStateUseCase behavior + admin settings page
4. Tests added/updated
5. Summarize files changed at the end

---

## PART C — Suspension system switch (NEW — required)

Add to `platform_settings`:
- `shopSuspensionEnabled` bool NOT NULL default **false** (soft launch: warn-only, do not lock shops)

Behavior matrix with existing flags:
1. `billingUiEnabled=false`: hide billing chrome; never overdue-suspend (admin suspend still possible). Banners off.
2. `billingUiEnabled=true` + `shopSuspensionEnabled=false` (default):
   - Still compute overdue/pre-expiry; show SuspensionBanner / PreExpiryBanner (annoying/persistent) when billing UI on
   - BUT `isSuspended` for overdue must be **false** for access purposes — `assertShopActive` / layout redirects / kiosk/online/staff must keep working
   - Prefer: keep `bannerLevel`/`preExpiryBannerLevel` for UI, but force `isSuspended=false` and `suspendReason` stay informative OR add `accessBlocked: boolean` — simplest: when suspension system off, after computeBillingState, if suspendReason==="overdue" set isSuspended=false, state stays "overdue" for banner copy, do not redirect to billing as blocked
3. `shopSuspensionEnabled=true`: current full suspension/dunning applies (still subject to threshold billing bypass when under N orders)

Admin UI Thai label: "ระบบระงับร้าน" with hint "ปิด = เตือนอย่างเดียว ร้านยังใช้ได้ · เปิด = ระงับเมื่อค้างชำระเกินกำหนด"

Tests:
- shopSuspensionEnabled=false + expired sub → assertShopActive succeeds; banners still have bannerLevel>0 if billingUiEnabled
- shopSuspensionEnabled=true + expired past grace → isSuspended true (unless billingUi off or under threshold)

Document default false in schema comment.

Implement PART A + B + C fully. Commit when TypeScript builds for changed files.
