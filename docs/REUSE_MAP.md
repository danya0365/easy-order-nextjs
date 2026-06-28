# Reuse Map — what a fork keeps vs replaces

When cloning into a new vertical, this map says what to **keep**, **reconfigure**, and **replace**. Files
are intentionally **not** physically split into `generic/` vs `domain/` folders. Use it with
[FORKING.md](FORKING.md).

> **Canonical base for new verticals = `easy-stamp-nextjs`.** This repo (**Easy Order**) is itself a fork
> of it — its vertical is **order / menu / kiosk**. This doc applies the same doctrine here, so the map is
> accurate if you ever fork *from* Easy Order too.
>
> **The one rule: keep by default. A fork subtracts only the *vertical bounded-context*.** Everything else
> — the whole platform **and** the whole storefront — stays. The first easy-stamp→easy-order clone got
> this wrong (deleted the storefront) and had to re-port it across 9 phases / 14+ commits. Don't repeat
> it; see the cautionary tale in [FORKING.md](FORKING.md).

## Three tiers (replaces the old binary generic/domain split)

Legend: 🟢 **Tier 1 — platform core** (keep as-is) · 🟡 **Tier 2 — storefront substrate** (keep, reconfigure copy/metrics) · 🔴 **Tier 3 — vertical domain** (the *only* thing you replace)

- **🟢 Tier 1 — platform core (~half the repo, never touched):** auth/session/2FA, billing (prepaid
  day-topup), payments/slip, subscriptions, notifications, audit log, rate-limiting + abuse guard, file
  storage (R2/local), geocoding, theming, brand config, i18n scaffold, ops (health / env-validation /
  cron dispatcher), the Clean-Arch skeleton + `GenericContainer`.
- **🟡 Tier 2 — storefront substrate (the reusable "local-business SaaS" layer — KEEP):** Shop & Branch,
  ShopProfile (about/hours/contacts), ShopImage/gallery, ShopCategory, ShopReview, the **public
  `/s/[slug]` profile page** + `ShopHero/ShopGallery/ShopDetails`, the homepage **map**, the **`/shops`
  directory**, Customer identity + device-binding + self-service history, leads/CRM, analytics,
  promote/poster studio. NOT vertical-specific. Some carry order *flavor* (analytics metrics, poster copy,
  the customers page showing order history) → light edit, **never delete**.
- **🔴 Tier 3 — vertical domain (REPLACE):** order/menu/kiosk only — menu categories/items, orders/order
  items, kiosk sessions, the kiosk ordering UI + KDS queue + counter POS. Swap this box for the next
  product's nouns (print jobs / queue tickets / …).

**Bottom line: ~85% of the repo (Tier 1 + Tier 2) is reused on every fork. Only Tier 3 is rewritten.**

## Tier 3 — the order/menu/kiosk box to DELETE (exhaustive)
| Layer | Paths |
| --- | --- |
| schema | `db/schema/{menu-categories,menu-items,orders,order-items,kiosk-sessions}.ts` |
| use-cases | `use-cases/{menu,order,kiosk}/` (whole dirs) + `use-cases/member/GetCustomerOrderHistoryUseCase.ts` |
| repo interfaces | `I{MenuCategory,MenuItem,Order,KioskSession}Repository.ts` |
| drizzle repos | the matching `Drizzle*Repository.ts` |
| components | `components/{menu,order,kiosk}/` (whole dirs) |
| actions | `actions/{menu,order,kiosk}-actions.ts` |
| routes | `app/(kiosk)/` + `app/(shop)/shop/{menu,orders,new-order}/` |
| i18n | the `menu` / `order` / `kiosk` namespaces in `messages/th.json` (+ vertical keys inside `shopPages/adminPages/staffPages/publicPages`) |

> Note: unlike easy-stamp, Easy Order has **no** vertical files under `domain/services/` (analytics lives
> in `use-cases/analytics/`; `promo-poster.ts` is Tier 2). And `CreateShopUseCase` does **not** auto-create
> a default menu — so there's no shop-creation coupling to undo.

## Tier 2 — storefront kept, but these are order-FLAVORED (reconfigure, don't delete)
| File | Why it touches the vertical | Fork edit |
| --- | --- | --- |
| `use-cases/customer/ExportCustomerDataUseCase.ts` | PDPA export pulls the orders tables | remove the order sections from the export |
| `use-cases/member/GetCustomerOrderHistoryUseCase.ts` | this IS the "what the customer sees after binding" view (the easy-stamp `loadCardView` equivalent) | listed in Tier 3 above; on fork, replace with your domain's customer view — the one non-trivial rewire |
| `use-cases/analytics/{GetShopAnalyticsUseCase,GetPlatformAnalyticsUseCase}.ts` + `DrizzleAnalyticsRepository`/`DrizzlePlatformAnalyticsRepository` | compute order metrics | rewrite the metrics for your domain |
| `app/(shop)/shop/customers/` + `components/shop/CustomerRowActions.tsx` | customers view shows order history | re-point to your domain's customer activity |
| `components/shop/promote/*` + `domain/services/promo-poster.ts` | poster copy is order-flavored | parameterize the copy/icon; keep the studio |

## Tier 1 — platform core (keep as-is)
| Group | Paths |
| --- | --- |
| domain services | `services/{subscription-status,topup-pricing,geo,osm-poi,phone,image-signature}.ts` |
| use-cases | `use-cases/{auth,billing,contact,line,platform,maintenance}` |
| app services | `services/*` (AuditLogger, LoginSecurityService, NotificationService, SensitiveActionGuard, all `I*` interfaces) |
| generic repos | `I{User,Session,AuditLog,Notification,RateLimit,Subscription,Payment,TopupTransaction,ContactRequest}Repository` + `pagination` + matching Drizzle impls |
| infra services | `Bcrypt…`, `CryptoTotpService`, `HibpPasswordBreachChecker`, `LineMessagingPusher`, `{Local,R2}SlipStorage`, `ManualSlipPaymentVerifier`, `OsmGeocoder`, `TurnstileVerifier`, `qr`, `promptpay` |
| generic schema | `db/schema/{users,sessions,audit-logs,notifications,rate-limits,subscriptions,payments,topup-transactions,contact-requests,_shared}` |
| generic UI/actions | `components/{ui,layout,auth,billing,channels,notification,pwa,settings}` + `ThemeSwitcher`; `actions/{auth,billing,contact,line,notification,security}-actions` |
| routes | `app/(auth)`, `app/(platform)`, `app/api/{health,cron,line,client-error}` |
| DI | `di/container.generic.ts` → `GenericContainer` (do not touch) |

> Tier 2 storefront kept as-is (not in the tables above): `shops · shop-categories · shop-images ·
> shop-profiles · shop-reviews · branches · customers · customer-devices · bind-codes · leads ·
> lead-visit-logs` (+ repos), `components/{shop,reviews,leads,map}`, `actions/{shop,lead,review}-actions`,
> `use-cases/{shop,lead,review}` + `member/{ClaimBindCode,GenerateBindCode,GetBoundShops}`, and
> `app/(public)/*` + `app/(shop)`/`app/(staff)` shells.

## Cross-cutting (always keep)
`src/config/brand.ts` · `src/i18n/*` · `instrumentation.ts` · theming (`public/styles/**`) · the four-layer
rule + `.dependency-cruiser.cjs` + lint setup · `scripts/` (test/seed/migrate/release helpers).

## DI naming (correct)
Two files, not "container.domain.ts": `di/container.generic.ts` (`GenericContainer`, Tier 1) and
`di/container.ts` (`class Container extends GenericContainer`, registers Tier 2 + Tier 3 repos). A fork
edits only `container.ts`: drop the Tier 3 vertical repos, add the new vertical's repos; keep all Tier 2
storefront repos registered.
