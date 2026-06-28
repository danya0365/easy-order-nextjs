# Forking this template into a new product

Step-by-step runbook for cloning into a new Thai vertical SaaS. **The canonical base for new verticals is
`easy-stamp-nextjs`** — this repo (**Easy Order**) is itself a fork of it (vertical = order/menu/kiosk).
The same doctrine is written here so it stays accurate if you ever fork *from* Easy Order. Use with
[REUSE_MAP](REUSE_MAP.md).

> **Mental model: subtract the vertical, keep the platform AND the storefront.**
> A fork deletes **only the order/menu/kiosk bounded-context** (Tier 3). It **keeps everything else** — the
> platform core (Tier 1) *and* the entire storefront substrate (Tier 2): shops, branches, public
> `/s/[slug]` profile, gallery/images, reviews, homepage map, `/shops` directory, customer identity +
> history, leads, analytics, promote. You then swap the vertical for your product's nouns and lightly
> re-flavor a handful of Tier-2 files. **If you find yourself deleting `shops`, `reviews`, the public
> profile, the map, or `customers`, stop — that's the mistake the cautionary tale below describes.**

---

## 0. Prep
- Copy the repo, set the new git remote, `npm install`.
- Pick the product's vertical nouns up front (e.g. `PrintJob`, `PrintFile`, `JobStatus`). You'll model
  these in step 5 following [EXTENDING.md](EXTENDING.md).

## 1. Rebrand (config + assets)
- `src/config/brand.ts` — `name` / `tagline` / `description` / `totpIssuer` / `userAgent`. Single source;
  flows into metadata, layouts, TOTP, manifest, OTP/2FA/LINE copy.
- `package.json` — `"name"`.
- `public/icons/*` — replace `icon-192.png` / `icon-512.png` / `logo-mark.png` / `logo-wordmark.png`.
- `app/opengraph-image.alt.txt` + `app/twitter-image.alt.txt` — rewrite the social-card alt text.
- Theme colors: edit `public/styles/themes/{cafe,minimal,retro}.css` (or add a new theme file) — the token
  layer is `var()`-only, real hex lives in these files.

## 2. Rewrite the per-clone content pages
Intentionally Thai prose, left for the clone: `app/(public)/{tutorial,privacy,info,tos}/page.tsx`. Keep
the PDPA export/erase wiring; rewrite the copy.

## 3. Delete the vertical (Tier 3) — the WHOLE delete-manifest
Delete only these (the order/menu/kiosk bounded-context). **Keep everything not listed here — including
the entire storefront.** Then fix the imports the compiler flags (steps 3.5–5).

- **DB schema** (`src/infrastructure/db/schema/`): `menu-categories.ts` · `menu-items.ts` · `orders.ts` ·
  `order-items.ts` · `kiosk-sessions.ts`. *(Then prune their re-exports from `index.ts`.)*
- **Use-cases** (`src/application/use-cases/`): `menu/` · `order/` · `kiosk/` (whole dirs) +
  `member/GetCustomerOrderHistoryUseCase.ts`.
- **Repo interfaces** (`src/application/repositories/`): `IMenuCategory` · `IMenuItem` · `IOrder` ·
  `IKioskSession`.
- **Drizzle repos** (`src/infrastructure/repositories/drizzle/`): the matching `Drizzle*Repository.ts`.
- **Components** (`src/presentation/components/`): `menu/` · `order/` · `kiosk/` (whole dirs).
- **Actions** (`src/presentation/actions/`): `menu-actions.ts` · `order-actions.ts` · `kiosk-actions.ts`.
- **Routes** (`app/`): `app/(kiosk)/` + `app/(shop)/shop/{menu,orders,new-order}/`.
- **i18n** (`messages/th.json`): the `menu` / `order` / `kiosk` namespaces; plus prune vertical keys inside
  `shopPages` / `adminPages` / `staffPages` / `publicPages`. Update `src/i18n/client-messages.ts` allowlist.

**Explicitly KEEP (Tier 2 storefront — do NOT delete):** `shops · shop-categories · shop-images ·
shop-profiles · shop-reviews · branches · customers · customer-devices · bind-codes · leads ·
lead-visit-logs` (+ repos), use-cases `shop/ lead/ review/ customer/` + `member/{ClaimBindCode,
GenerateBindCode,GetBoundShops}` + `analytics/`, components `{shop,reviews,leads,map}` + `promote/`,
actions `{shop,lead,review}-actions`, and `app/(public)/* · app/(shop) · app/(staff)` shells.

## 3.5 Decouple-on-fork (kept Tier-2 files that touch the vertical)
After deleting Tier 3 the compiler will flag these. They are **kept** — edit, don't delete:
- `use-cases/customer/ExportCustomerDataUseCase.ts` — drop the orders tables from the PDPA export; keep the
  customer/shop core data.
- `use-cases/member/GetCustomerOrderHistoryUseCase.ts` (deleted above) — this WAS the "what the customer
  sees after binding" view. Replace it with your domain's equivalent (Easy Order made it order history;
  easy-stamp's original was a stamp card view). **The one non-trivial rewire** — decide what a bound
  customer sees in your product.
- `use-cases/analytics/{GetShopAnalyticsUseCase,GetPlatformAnalyticsUseCase}.ts` + the
  `DrizzleAnalyticsRepository`/`DrizzlePlatformAnalyticsRepository` — rewrite the metrics for your domain.
- `app/(shop)/shop/customers/` + `components/shop/CustomerRowActions.tsx` — re-point the customer view from
  order history to your domain's customer activity.
- `components/shop/promote/*` + `domain/services/promo-poster.ts` — parameterize the order-flavored poster
  copy/icon; keep the studio.

> Easy Order is already fairly clean: `CreateShopUseCase` does **not** auto-create a default menu, and
> there are no menu/order actions inside `shop-actions.ts` — so unlike easy-stamp there's no
> shop-creation/stamp-type coupling to undo.

## 4. Repoint the DI container
Two files (there is **no** `container.domain.ts`):
- `src/infrastructure/di/container.generic.ts` — `GenericContainer`, the Tier-1 core. **Don't touch.**
- `src/infrastructure/di/container.ts` — `class Container extends GenericContainer`, registers Tier-2 +
  Tier-3 repos. **Drop the Tier-3 vertical repo fields (menu/order/kiosk), add your new vertical's repos.**
  Keep all the storefront (Tier-2) repos registered.

## 5. Model the new domain
Follow [EXTENDING.md](EXTENDING.md) per entity: schema → migration → entity → repo interface → Drizzle
repo → register in `container.ts` → use case → action → UI → tests. Reuse billing/notifications/audit/
auth/rate-limit as-is; rewrite the analytics metrics + customer view (step 3.5) and update the tab-nav
config in `src/presentation/components/layout/AppTabBar.tsx` + `CustomerTabBar.tsx`.

## 6. Reset migrations + seed
Domain schema changed, so regenerate: delete `drizzle/*.sql` + the journal, run `npm run db:generate`,
point at a fresh local DB, `db:push`. Rewrite `scripts/seed/*` for the new domain (keep the shop/customer
seed scaffolding). (Migrations target **prod** Turso by default — override env for local; see
[DEPLOYMENT.md](DEPLOYMENT.md).)

## 7. Per-clone config
- `.env.example` → `.env.local`: keep the Tier-1 groups (Turso, session, R2, LINE, Turnstile, cron, log,
  error-webhook, email); set `PROMPTPAY_TARGET` if you keep slip billing.
- Roles: `src/domain/types/roles.ts` — rename `shop_owner`/`branch_staff` to the product's roles; update
  `ROLE_HOME`, `ROLE_LABEL_KEY`, and the `common.role*` messages.

## 8. Verify (must be green before first deploy)
`npx tsc --noEmit` · `npm run lint:all` · `npm test` · `npx next build`. Then work the
[TEMPLATE_AUDIT.md](TEMPLATE_AUDIT.md) boxes you skipped and follow [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Cautionary tale — why this doc is "keep by default"
This very repo is the cautionary tale. The first fork (easy-stamp → **Easy Order**) followed an earlier
version of these docs that classified the **storefront as domain** and deleted it. The result: the public
shop profile, reviews, homepage map, `/shops` directory, customer identity, leads, analytics, and promote
all had to be **re-ported across 9 phases / 14+ commits** (`e9710a9` categories → `ad83770` map/directory)
— pure duplicated effort. That storefront is **Tier 2 — reusable substrate**, not vertical domain. A fork
that only deletes the vertical (Tier 3) and re-flavors the few files in step 3.5 skips all of that.
