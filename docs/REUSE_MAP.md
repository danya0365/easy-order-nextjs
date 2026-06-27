# Reuse Map — generic vs domain

When cloning this template into a new product (e.g. **Easy Queue**), this map says what to **keep**,
what to **configure**, and what to **rewrite**. It's a documented boundary — files are intentionally
**not** physically split into `generic/` vs `domain/` folders (that bulk move would churn imports
across the whole repo for little gain). Use this as the fork checklist.

Legend: 🟢 **generic** (keep ~as-is) · 🟡 **configure** (keep, set per product) · 🔴 **domain** (rewrite for the new product)

## The quick version
- **Keep (the ~40% that's product-agnostic):** auth/session/2FA, billing (prepaid day-topup),
  notifications, audit log, rate-limiting + abuse guard, file storage, geocoding, payments/slip,
  theming, brand config, i18n, ops (health/env-validation/cron dispatcher), the Clean-Arch skeleton
  + DI container.
- **Rewrite (the domain):** stamp cards / stamp types / balances / reward redemptions, shop & branch
  onboarding, customer + device binding, lead/CRM, shop reviews. Swap these for the new product's
  nouns (queue tickets, venues, parties, …).

## Domain layer (`src/domain`)
| Module | Class | Notes |
| --- | --- | --- |
| `services/{subscription-status,topup-pricing}.ts` | 🟢 | Billing math (day-topup). |
| `services/{geo,osm-poi,phone}.ts` | 🟢 | Geo + TH phone utils. |
| `services/{card-view,promo-poster,analytics}.ts` | 🔴 | Stamp/shop-specific. (analytics *pattern* is reusable, metrics aren't.) |
| `types/roles.ts` | 🟡 | RBAC pattern is generic; the role names (`shop_owner`/`branch_staff`) are domain. |
| `entities/` | 🟡 | Mixed file — `User/Session/Subscription/Payment/Notification/AuditLog/ContactRequest` 🟢; `Shop/Stamp*/Customer/Reward*/Lead*` 🔴. |

## Application layer (`src/application`)
| Group | Class | Notes |
| --- | --- | --- |
| `use-cases/{auth,billing,contact,line,platform}` | 🟢 | Account, day-topup billing, support contact, LINE linking. |
| `use-cases/{stamp,shop,member,lead,review}` | 🔴 | Core domain — rewrite. (`member` = customer device-binding, pattern reusable.) |
| `services/*` (AuditLogger, LoginSecurityService, NotificationService, SensitiveActionGuard, `I*` interfaces, slip-media) | 🟢 | All product-agnostic. |
| `repositories/I{User,Session,AuditLog,Notification,RateLimit,Subscription,Payment,TopupTransaction,ContactRequest}` + `pagination` | 🟢 | Generic interfaces. |
| `repositories/I{Shop*,Branch,Customer*,BindCode,Stamp*,RewardRedemption,Lead*,Analytics,PlatformAnalytics}` | 🔴 | Domain interfaces. |

## Infrastructure layer (`src/infrastructure`)
| Group | Class | Notes |
| --- | --- | --- |
| `auth/`, `di/container.ts`, `db/client.ts`, `config/env.ts` | 🟢/🟡 | Skeleton — keep; container registers both generic + domain repos (prune the domain ones). |
| `services/{BcryptPasswordHasher,CryptoTotpService,HibpPasswordBreachChecker,LineMessagingPusher,Local/R2SlipStorage,ManualSlipPaymentVerifier,OsmGeocoder,TurnstileVerifier,qr,promptpay}` | 🟢 | All reusable (promptpay = TH payments). |
| `repositories/drizzle/Drizzle{User,Session,AuditLog,Notification,RateLimit,Subscription,Payment,TopupTransaction,ContactRequest}Repository` | 🟢 | Generic. |
| `repositories/drizzle/Drizzle{Shop*,Branch,Customer*,BindCode,Stamp*,RewardRedemption,Lead*,Analytics}Repository` | 🔴 | Domain. |
| `db/schema/{users,sessions,audit-logs,notifications,rate-limits,subscriptions,payments,topup-transactions,contact-requests,_shared}` | 🟢 | Generic tables. |
| `db/schema/{shops,branches,shop-*,customers,customer-devices,bind-codes,stamp-*,reward-redemptions,leads,lead-visit-logs}` | 🔴 | Domain tables. |

## Presentation layer (`src/presentation` + `app/`)
| Group | Class | Notes |
| --- | --- | --- |
| `components/{ui,layout,auth,billing,channels,notification,pwa,settings}`, `ThemeSwitcher` | 🟢 | Reusable UI. (`layout` tab config + `settings` tab content are domain; the components are generic.) |
| `components/{stamp,shop,reviews,leads,analytics}`, parts of `admin` | 🔴 | Domain UI. (`map` is generic mapping, currently wired to shops.) |
| `actions/{auth,billing,contact,line,notification,security}-actions` | 🟢 | Generic actions. |
| `actions/{stamp,shop,lead,review}-actions`, parts of `admin-actions` | 🔴 | Domain actions. |
| `app/(auth)`, `app/api/{health,cron,line}` | 🟢 | Auth shell + ops/integration routes. |
| `app/(shop)`, `app/(staff)`, `app/(platform)`, `app/(public)`, `app/api/{shop-images,slips,lead-photos,geo}` | 🔴/🟡 | Shells/structure reusable; routes + copy are domain. |

## Cross-cutting (always keep)
`src/config/brand.ts` · `src/i18n/*` · `instrumentation.ts` · theming (`public/styles/**`) · the four-layer
rule + `.dependency-cruiser.cjs` + lint setup · `scripts/` (test/seed/migrate/release helpers).

## Fork procedure (Easy Queue, in order)
1. Copy the repo; set `src/config/brand.ts` (name/tagline) + `public/icons/*` + `app/*-image.alt.txt`.
2. Keep all 🟢. Delete the 🔴 schema/entities/repos/use-cases/components/actions for stamps/shops/leads/reviews.
3. Model the new domain (e.g. `Venue`, `QueueTicket`, `TicketStatus`) following [EXTENDING.md](EXTENDING.md):
   schema → migration → entity → repo interface → Drizzle repo → container → use case → action → UI.
4. Reuse billing/notifications/audit/auth as-is; adjust analytics metrics + the tab nav config.
5. Translate copy via the i18n catalog; work the [TEMPLATE_AUDIT.md](TEMPLATE_AUDIT.md) P2 items.

> Optional hardening (deferred): once the boundary is stable, a `dependency-cruiser` rule could flag
> 🟢→🔴 imports so generic code never depends on domain code. Not added now because the current
> container + a few shells legitimately reference both; adding it would require first untangling those.
