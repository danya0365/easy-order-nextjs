---
name: easy-order-dashboard-parity-backlog
description: "Easy Order dashboard/parity backlog — what shipped (FeatureGrid, helpers-during-impersonation, performedBy UI, settings tabs, kiosk polish) + remaining ideas"
metadata:
  node_type: memory
  type: project
  originSessionId: 1a43c7ec-1fa7-4ad3-b55c-a5c2837e5bb4
---

Originally captured 2026-06-28 (carousel/onboarding looked "missing" — they were just gated to `!impersonating`). **That whole batch is now SHIPPED** (same session, post-compact), verified by static gate + live Playwright on the seeded local DB:

- **FeatureGrid ported** — new `src/presentation/components/shop/FeatureGrid.tsx` (async server component, `shop` namespace, 12 ordering tiles: orders/menu/customers/analytics/promote/reviews/branches/staff/kiosk/notifications/billing/settings). Replaced the thin 3-tile quick-links on `/shop`. `feat*` i18n keys were already half-present; added the ordering-domain ones.
- **Helpers show during impersonation** — removed `showOwnerHelpers = !impersonating` gate in `app/(shop)/shop/page.tsx`; `FeatureCarousel` + `OnboardingSuggestions` always render. Onboarding's `lineLinked` is now computed against the real shop **owner** (found in the already-loaded `users` list), not the acting admin. **Open decision resolved: show both.**
- **`orders.performedBy` surfaced** — repo-layer resolution (covers load-more): `DrizzleOrderRepository.listActiveByShop`/`pageHistoryByShop` batch-resolve performer ids → email via new `loadPerformerEmails`; added optional `OrderWithItems.performedByEmail`. `OrderQueue` renders "เปิดโดย: {email}" or "ลูกค้าสั่งเอง" (kiosk). i18n: `order.placedByLabel`/`selfServeTag`.
- **Settings tabbed layout** — new `src/presentation/components/settings/SettingsTabs.tsx` (client, built on existing `TabSelect`). `app/(shop)/shop/settings/page.tsx` now groups cards into tabs ร้าน/รายละเอียด/รูปภาพ/หน้าร้าน + footer (Security + ContactAdmin). i18n: `shopPages.tabShop/tabDetails/tabImages/tabKiosk` (server namespace); `common.settingsCategoryAria` already existed.
- **Kiosk polish** — `KioskOrdering.tsx`: itemized receipt on the result screen (snapshots cart into `receipt` state), auto cart-reset 60s after an order, and a new `AttractScreen.tsx` idle overlay after 60s of no interaction (empty cart) dismissed on any tap. `shopName` now passed from the kiosk page. i18n: `kiosk.resultItemsTitle`/`attractCta`. NOTE: react-hooks rule forbids synchronous `setState` in an effect body — the idle effect only arms timers and the render is gated (`idle && count===0 && !checkoutOpen`); the `bump` event handler clears idle.

**Still NOT done (candidates to discuss — none approved):**
- Swap OSM community map tiles for a real provider before heavy production load.
- Customer "order ready" signal (kiosk shows a queue number; no notify-when-ready) — may be out of product scope; confirm first.
- Kiosk receipt printing (currently on-screen only).

See [[project-easy-order]] for the full built/pending history. Verification rule still applies: [[verify-by-running-the-app]].
