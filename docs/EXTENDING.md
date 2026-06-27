# Extending the codebase

How to add features without breaking the Clean-Architecture layering. The rules below are
**enforced mechanically** ([`.dependency-cruiser.cjs`](../.dependency-cruiser.cjs) + ESLint) — see
[ARCHITECTURE.md](ARCHITECTURE.md) for the diagram.

## The dependency rule (one direction only)
```
domain → application → infrastructure → presentation
```
- **domain** (`src/domain`) — pure business types + logic. NO imports of Next/React/Drizzle/other layers.
- **application** (`src/application`) — use cases + repository/service **interfaces**. May import domain only. NEVER infrastructure/ORM/presentation.
- **infrastructure** (`src/infrastructure`) — Drizzle repos, external services, DI container, auth/session. Implements application interfaces.
- **presentation** (`src/presentation` + `app/`) — server components, actions, UI. Components must NOT import the DI container or repositories directly.

Cross-cutting pure constants (e.g. [`src/config/brand.ts`](../src/config/brand.ts)) are dependency-free and importable anywhere.

## Add a new persisted entity (end to end)
Example: a `Coupon` owned by a shop.

> **Shortcut:** `npm run scaffold <PascalName> [table_name]` generates the three
> boilerplate files (repo interface, Drizzle repo, create use-case) as
> TODO-stubbed skeletons and prints the remaining manual wiring. The numbered
> guide below is the full version the scaffolder is based on.

1. **Schema** — `src/infrastructure/db/schema/coupons.ts` (Drizzle table, scope by `shopId` with `onDelete: "cascade"`, add indexes for hot queries). Export it from `src/infrastructure/db/schema/index.ts`.
2. **Migration** — `npm run db:generate` (writes SQL to `drizzle/`), review the SQL, commit it. (Prod applies it automatically on build.)
3. **Domain entity** — add the `Coupon` type to `src/domain/entities`.
4. **Repository interface** — `src/application/repositories/ICouponRepository.ts`. Every method that reads/writes tenant data takes a `shopId` and scopes by it.
5. **Drizzle implementation** — `src/infrastructure/repositories/drizzle/DrizzleCouponRepository.ts`. **Must start with `import "server-only";`** (enforced). Every query filters by `shopId`.
6. **Register in the container** — add a field to `class Container` in [`src/infrastructure/di/container.ts`](../src/infrastructure/di/container.ts):
   ```ts
   readonly couponRepository: ICouponRepository = new DrizzleCouponRepository();
   ```
7. **Use case** — `src/application/use-cases/coupon/IssueCouponUseCase.ts`. Depends on the interface (constructor-injected), holds the business rules. Keep logic here, not in the action.
8. **Server action** — in `src/presentation/actions/...`: authorize with `requireShopWrite()` (owner or impersonating admin) → `requireRole(...)` for admin-only, get `{ actor, shopId }`, build the use case with `container.*` repos, `revalidatePath(...)`, return `{ error?: string }`. Audit sensitive writes via `container.auditLogger.record({ actorUserId: actor.id, ... })`.
9. **UI** — a server component/page loads data via `container` (pages may) and passes plain props to client components. Components call the action, never the container/repos.
10. **Tests** — an integration test using `seedShop()` + the real container; include a **wrong-tenant** negative case. See [TESTING.md](TESTING.md).

## Conventions that are NOT auto-enforced (cover with tests + review)
- **Every tenant query is scoped by `shopId`.** A missing filter is a cross-tenant leak.
- **Every mutating action authorizes** (`requireRole` / `requireShopWrite`) before touching data.
- **Business logic lives in the use case**, not the action or component.
- **Abuse-prone actions** go through `container.sensitiveActionGuard` / `rateLimitRepository` (see the pause + 2FA-verify examples).

## i18n (next-intl, single-locale `th`, no routing)
User-facing strings live in [`messages/th.json`](../messages/th.json) (grouped by namespace), wired
via [`src/i18n/request.ts`](../src/i18n/request.ts) + the `createNextIntlPlugin` in `next.config.ts`.
- **Server component:** `const t = await getTranslations("namespace")` → `t("key")`.
- **Client component:** `const t = useTranslations("namespace")` → `t("key")` (works because the root
  layout wraps everything in `NextIntlClientProvider`).
- Add a string → add the key to `messages/th.json` (and `en.json` for parity); keys are
  type-checked (`global.d.ts`), so a typo/missing key fails `tsc`.
- Exception: `app/global-error.tsx` replaces the root layout, so it can't use the provider — keep
  its few strings inline.
- New surfaces should use `t()` instead of hardcoding; migrate existing Thai strings page-by-page.

**Client bundle scoping (important):** only the namespaces listed in
[`src/i18n/client-messages.ts`](../src/i18n/client-messages.ts) are sent to the browser — server
components translate via `getTranslations` at zero client cost (per Next's i18n guide). So:
- A **client** component (`useTranslations`) may only use a namespace that's in `getClientMessages()`.
  Add yours there (keys are type-checked) — otherwise it throws "missing messages" at runtime.
- A **server** component may use any namespace freely; don't add server-only ones to the client list.

## UI / theming / brand
- Use **semantic theme tokens** only (`bg-brand-500`, `text-muted`, `bg-card`, `border-border`). Hardcoded hex / `gray-*` palettes are blocked by ESLint + stylelint. Add a theme by copying `public/styles/themes/*.css`.
- Product name/identity comes from [`src/config/brand.ts`](../src/config/brand.ts) — don't hardcode the app name.

## Checks before commit
```bash
npx tsc --noEmit && npm run lint:all && npm test && npx next build
```
`lint:all` runs ESLint + stylelint + dependency-cruiser (the layering guard). All four must be green.

## Migrations cheat-sheet
- Change schema → `npm run db:generate` → review + commit the new `drizzle/*.sql`.
- Local apply: `npm run db:push` (dev) or `npm run db:migrate`. Prod applies on build (`scripts/vercel-migrate.mjs`).
- Migrations are append-only; there are no down-migrations (see [TEMPLATE_AUDIT.md](TEMPLATE_AUDIT.md) P2).
