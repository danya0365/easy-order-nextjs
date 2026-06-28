---
name: fork-doctrine-3tier
description: "Fork doctrine for the SaaS template family: base = easy-stamp; forks keep platform + storefront, delete only the vertical box (3-tier, keep-by-default)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1a43c7ec-1fa7-4ad3-b55c-a5c2837e5bb4
---

**Decision (2026-06-28):** The canonical base template for future verticals (next: **easy-print**) is
**`/Users/marosdeeuma/easy-stamp-nextjs`**. Forking rule = **keep by default; a fork deletes ONLY the
vertical bounded-context (stamp), keeping the whole platform core AND the whole storefront substrate.**

**Why:** the original easy-stamp→easy-order clone followed fork docs that classified the storefront as
"domain" and deleted it, forcing a re-port across 9 phases / 14+ commits (`e9710a9`→`ad83770`). Pure
wasted dup work. See [[easy-order-dashboard-parity-backlog]] for the tail end of that re-port.

**3-tier model** (now the authoritative framing in easy-stamp's docs):
- 🟢 Tier 1 platform core — auth/2FA, billing day-topup, payments, subs, notif, audit, rate-limit, R2,
  geocoder, theming, brand, i18n, ops, Clean-Arch + `GenericContainer`. Keep as-is.
- 🟡 Tier 2 storefront substrate — Shop/Branch/ShopProfile/Image/Category/Review, public `/s/[slug]`,
  homepage map, `/shops`, Customer identity+binding+history, leads, analytics, promote. **Keep**; some are
  stamp-*flavored* → light edit (copy/metrics/default-reward), never delete. ~85% of repo = Tier1+Tier2.
- 🔴 Tier 3 vertical domain — the stamp box ONLY. The only thing a fork replaces.

**Tier 3 delete-manifest (verified vs code):** schema `stamp-{types,cards,balances,transactions}` +
`reward-redemptions`; `use-cases/stamp/`; `I{StampType,StampCard,StampBalance,StampTransaction,
RewardRedemption}` + Drizzle; `components/stamp/`; `stamp-actions.ts`; routes `(shop)/shop/{stamps,qr,
redemptions}`; `domain/services/{card-view,analytics}.ts`; `stamp` i18n namespace.

**Decouple-on-fork (Tier-2 files importing stamp — edit, don't delete):** `CreateShopUseCase` +
`ConvertLeadToShopUseCase` (default stamp type), `ExportCustomerDataUseCase` (PDPA stamp tables),
`member/{GetBoundCardsUseCase,GetCardByDeviceTokenUseCase}` (`loadCardView` binding → repoint to the
vertical's customer view; in easy-order this became order history), `GetShopAnalyticsUseCase` (metrics),
`shop-actions.ts` (stampType actions), `StampTypesManager`/`ShopQrPoster`, `promote/*` + `promo-poster.ts`.

**DI fact:** there is NO `container.domain.ts`. Real split = `container.generic.ts`→`GenericContainer`
(Tier 1) + `container.ts`→`class Container extends GenericContainer` (Tier 2+3). Fork edits only
`container.ts`.

**Done this session:** rewrote the fork docs in BOTH repos to encode the above —
- easy-stamp: `docs/FORKING.md`, `docs/REUSE_MAP.md`, AGENTS.md (vertical=stamp box).
- easy-order: `docs/FORKING.md`, `docs/REUSE_MAP.md`, AGENTS.md (vertical=order/menu/kiosk; notes base=easy-stamp). easy-order is cleaner than easy-stamp — no default-menu creation in CreateShop, no menu/order actions in shop-actions; its only decouple points are `ExportCustomerDataUseCase` (PDPA order tables), `member/GetCustomerOrderHistoryUseCase` (the bound-customer view), `analytics/*` metrics, customers page, promote/promo-poster copy.

(Optional follow-up, not done: make the vertical box truly pluggable so Tier-2 stops importing it.)
Verification rule: [[verify-by-running-the-app]] (docs here verified by path cross-check, not build).
