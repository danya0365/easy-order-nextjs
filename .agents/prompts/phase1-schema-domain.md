# Phase 1 only: schema + domain + repos + core use-cases (online order + platform billing flags)

Repo: /workspace/easy-order-cf branch feat/online-order-fulfillment.
Keep vinext WIP files untouched. Do not deploy. Thai errors. Match existing code style.

## 1. shops schema (`src/infrastructure/db/schema/shops.ts`)
Add columns (boolean via integer mode like selfService):
- onlineOrderingEnabled default false
- pickupEnabled default true  
- deliveryEnabled default false
- deliveryFeeSatang integer default 0 notNull
- deliveryNotes text nullable
- minOrderSatang integer nullable

## 2. orders schema (`src/infrastructure/db/schema/orders.ts`)
Add:
- ORDER_CHANNELS = ["kiosk","counter","online"] 
- ORDER_FULFILLMENT_TYPES = ["pickup","delivery","dine_in"]
- channel text enum default "kiosk" notNull
- fulfillmentType text enum default "pickup" notNull  
- deliveryAddress text nullable
Update table comment.

## 3. New platform_settings schema file + export from index
```
platform_settings table:
  id text PK  (use "default")
  billingUiEnabled bool default true notNull
  orderThresholdBillingEnabled bool default false notNull
  orderThresholdCount int default 50 notNull
  shopSuspensionEnabled bool default false notNull  // soft-launch: warn only
  updatedAt
```
Migration SQL must INSERT OR IGNORE default row.

## 4. Run `npm run db:generate` to produce drizzle migration + meta.

## 5. Domain entities (`src/domain/entities/index.ts`)
- Extend Shop + Order
- Add PlatformSettings interface
- Export OrderChannel, FulfillmentType types

## 6. Repos
- Update IShopRepository UpdateShopSettingsInput + DrizzleShopRepository toShop/updateSettings
- Update IOrderRepository CreateOrderInput with channel?, fulfillmentType?, deliveryAddress?, deliveryFeeSatang? 
  - create(): totalSatang = subtotal + (deliveryFeeSatang ?? 0); persist new fields; toOrder maps them
  - Add countByShop(shopId): Promise<number>
- New IPlatformSettingsRepository + DrizzlePlatformSettingsRepository (get returns default row creating if missing; update)
- Register on container.ts

## 7. PlaceOrderUseCase
Add IShopRepository 4th ctor dep. Extend PlaceOrderInput with channel, fulfillmentType, deliveryAddress.
Online channel guards as in product: onlineOrderingEnabled, pickup/delivery enabled, address required for delivery, min order, delivery fee applied, performedBy null, require name+phone for online.
Pass fields to orders.create. Update ALL call sites (order-actions kiosk/counter pass channel; tests).

## 8. UpdateShopSettingsUseCase
Accept + persist new online/pickup/delivery/fee/notes/minOrder fields with validation (fee >=0, minOrder null or >=0).

## 9. GetBillingStateUseCase
Inject platform settings repo + order repo.
BillingState add: billingUiEnabled: boolean; shopSuspensionEnabled: boolean.
Logic:
a) Load platform settings
b) Compute base via computeBillingState (or active if no sub)
c) If orderThresholdBillingEnabled && countByShop < orderThresholdCount: force active-like (no overdue suspend, bannerLevel=0, preExpiry=0) but keep admin suspend
d) If !billingUiEnabled: force no overdue suspend, banners 0; admin suspend still applies
e) If !shopSuspensionEnabled and suspendReason would be overdue: set isSuspended=false (keep state/bannerLevel so UI can nag). Admin suspend still blocks.
f) assertShopActive uses isSuspended/isPaused — so with suspension off, overdue shops work

## 10. Tests
- Extend order.integration.test.ts for online guards + fee
- Extend subscription-status.test.ts OR billing-flow.integration.test.ts for the three platform flags including shopSuspensionEnabled=false keeps access

## 11. Commit message: feat(order,billing): schema + domain for online fulfillment and platform billing switches

Stop after phase 1 compiles/tests for these files. Do NOT build full public UI yet (phase 2).
