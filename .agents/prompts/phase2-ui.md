# Phase 2: Public online order UI + settings + admin billing toggles + queue badges

Repo `/workspace/easy-order-cf` on `feat/online-order-fulfillment`. Phase 1 already committed (0ce43b2). Do NOT rewrite schema/domain. Keep vinext WIP uncommitted. Do not deploy.

## A. Public online order
1. Add server action `placeOnlineOrderAction` in `src/presentation/actions/order-actions.ts` (or new file):
   - Input: slug, cart, paymentMethod, note?, customerName, customerPhone, fulfillmentType, deliveryAddress?
   - find shop by slug; assertShopActive(shop.id); rate limit `order_online:${shopId}:${ip}` (limit ~20 / 5min)
   - PlaceOrderUseCase with channel:"online", performedBy null, shops+orders+items+customers deps
   - notifyShopOwner like kiosk path; return PlaceOrderResult via existing buildOrderResult if exported, or duplicate minimal return
2. Page `app/(public)/s/[slug]/order/page.tsx`:
   - force-dynamic; load shop by slug; if !shop notFound(); if !onlineOrderingEnabled show Thai "ร้านยังไม่เปิดรับออเดอร์ออนไลน์" with link back
   - Load menu via GetKioskMenuUseCase
   - Render client `OnlineOrdering` component
3. Client `src/presentation/components/order/OnlineOrdering.tsx`:
   - Props: shop (needed fields), menu categories/items, pickupEnabled, deliveryEnabled, deliveryFeeSatang, deliveryNotes, minOrderSatang, hasPromptPay
   - Cart, fulfillment radio (only enabled), name/phone required, address if delivery, note, payment method, place order → show orderNo success
   - Style like existing KioskOrdering/StaffOrderEntry (Tailwind, Card, Button)
4. On `app/(public)/s/[slug]/page.tsx`: if shop.onlineOrderingEnabled, prominent Link CTA "สั่งออนไลน์" → `/s/${slug}/order`

## B. Shop settings form
- Extend SettingsForm + updateSettingsAction + settings page props for:
  onlineOrderingEnabled, pickupEnabled, deliveryEnabled, deliveryFeeSatang (show as baht), deliveryNotes, minOrderSatang (baht, empty=null)
- Thai labels. Checkboxes/toggles. Use UpdateShopSettingsUseCase fields already added in phase 1.
- Read updateSettingsAction in shop-actions.ts and wire FormData fields.

## C. Staff order queue badges
- OrderQueue OrderCard + history: show channel badge (คiosk/เคาน์เตอร์/ออนไลน์) and fulfillment (รับเอง/ส่ง/ทานที่ร้าน); if deliveryAddress show it
- Add keys to messages/th.json and en.json under `order`

## D. Platform admin settings + hide billing chrome
1. `app/(platform)/admin/settings/page.tsx` + form:
   - billingUiEnabled: "แสดง UI ค่าบริการรายเดือน"
   - orderThresholdBillingEnabled + orderThresholdCount: "คิดเงินเมื่อออเดอร์ถึงเกณฑ์"
   - shopSuspensionEnabled: "ระบบระงับร้าน" hint "ปิด = เตือนอย่างเดียว ร้านยังใช้ได้ · เปิด = ระงับเมื่อค้างชำระเกินกำหนด"
   - Server action updatePlatformSettingsAction in admin-actions.ts (require platform admin)
2. Layouts `app/(shop)/layout.tsx` and `app/(staff)/layout.tsx`:
   - From getBillingState, if !billingUiEnabled: skip SuspensionBanner, PreExpiryBanner, and skip redirect to /shop/billing for suspended
   - If billingUiEnabled but !shopSuspensionEnabled: still show banners (annoying) but do NOT redirect/block for overdue (isSuspended already false from use-case for overdue)
3. Hide billing nav: find AppTabBar / links to /shop/billing — hide when !billingUiEnabled (pass prop or read settings)
4. `/shop/billing` page: if !billingUiEnabled show notice, hide TopupForm
5. Admin payments: optional notice when billing UI off

## E. i18n
Add needed Thai+EN strings in messages/th.json and messages/en.json.

## F. Commit
`feat(ui): online order page, shop/admin settings, billing chrome gates`
Leave vinext files unstaged.

Verify with: node test for order+billing still pass; tsc errors only pre-existing vinext/cf.
