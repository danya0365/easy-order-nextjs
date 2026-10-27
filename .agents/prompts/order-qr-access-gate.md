# Easy Order: Shop QR gate for online ordering

Work in `/workspace/easy-order-cf` on branch `feat/online-order-fulfillment` (already checked out).
Follow clean architecture. Thai user-facing strings via next-intl (`messages/th.json` + `en.json`). Lucide icons only. Semantic theme tokens only. Do NOT print secrets. Do NOT deploy. Do NOT push. Commit when done.

## Why
Marosdee rejected open public `/s/[slug]/order` — anyone can order. Same idea as Easy Wash shop QR bind: **who orders must scan that shop’s QR first**. Device/session tied to that shop only.

## Product rules (must ship)
1. Direct visit `/s/[slug]/order` **without** valid shop-access cookie → **no cart / cannot place**. Show Thai EmptyState: must scan QR at this shop.
2. Shop owner/staff can show/print a **shop order QR** (settings). Scanning opens claim URL for **that slug only**.
3. Claim sets **httpOnly cookie** scoped to that shop — mirror `eo_member_<slug>` / `setMemberCookie` in `src/infrastructure/auth/member.ts`.
4. `placeOnlineOrderAction` must **reject** if cookie missing or wrong shop — not only hide UI.
5. Keep pickup/delivery settings; kiosk (`placeOrderAction`) + counter (`placeOrderForCustomerAction`) stay **ungated**.
6. Public `/s/[slug]` may show shop info; **hide “สั่งออนไลน์” CTA** unless order-access cookie exists. After QR scan → redirect to `/s/[slug]/order`.

## Design — Option A (HMAC signed token, preferred; no new schema if possible)

### Token + cookie
- Claim URL: `/s/[slug]/enter?t=<signed>`
- Token payload: shopId + slug + exp (unix seconds). Sign with HMAC-SHA256.
- Secret: `process.env.ORDER_ACCESS_SECRET || process.env.CRON_SECRET` (document `ORDER_ACCESS_SECRET` in `.env.example`; never log it). If neither set → verification fails closed.
- Pure sign/verify helpers in domain or a small pure module e.g. `src/domain/services/order-access-token.ts` (unit-testable, no I/O). Use `node:crypto` createHmac + timingSafeEqual. Format compact e.g. `v1.<base64url(payload)>.<base64url(mac)>`.
- Cookie name: `eo_order_<slug>` (helpers in `src/infrastructure/auth/order-access.ts`):
  - `orderAccessCookieName(slug)`
  - `getOrderAccess(slug): Promise<{ shopId: string } | null>` — read cookie, verify sig + slug match + not expired
  - `setOrderAccessCookie(slug, shopId)` — mint cookie token with longer TTL (~30 days), httpOnly, secure via `isProd`, sameSite lax, path `/`
  - `requireOrderAccess(slug)` — throws Thai `"ต้องสแกน QR ที่ร้านนี้ก่อนจึงจะสั่งออนไลน์ได้"` when missing/invalid
- Claim QR token TTL: ~7–14 days (staff page regenerates on each load so QR stays fresh).
- Cookie TTL after claim: ~30 days.

### Routes
1. **NEW** `app/(public)/s/[slug]/enter/route.ts` (GET, like `link/route.ts`):
   - Parse `t` query; load shop by slug; verify token for **this** shopId+slug; if fail → redirect `/s/[slug]/order?access=denied` (or shop page with flag).
   - On success: `setOrderAccessCookie(slug, shop.id)` → redirect `/s/[slug]/order`.
2. Update `app/(public)/s/[slug]/order/page.tsx`:
   - After onlineOrderingEnabled / assertShopActive / pickup|delivery checks: call `getOrderAccess(slug)`.
   - If null → EmptyState Thai title/desc (keys in publicPages): e.g. `onlineOrderNeedQrTitle` = "ต้องสแกน QR ที่ร้าน", `onlineOrderNeedQrDesc` = "เพื่อสั่งออนไลน์ กรุณาสแกนคิวอาร์ของร้านนี้ที่หน้าร้านเท่านั้น" — **do not render OnlineOrdering / cart**.
   - If ok → existing OnlineOrdering UI.
3. Update `app/(public)/s/[slug]/page.tsx`:
   - CTA “สั่งออนไลน์” only when `shop.onlineOrderingEnabled && (await getOrderAccess(slug))`. Prefer show CTA after QR enter only.

### Server action
In `placeOnlineOrderAction` (`src/presentation/actions/order-actions.ts`):
- After resolving shop by slug, **before** PlaceOrderUseCase: `await requireOrderAccess(input.slug)` (or getOrderAccess and return `{ error: "..." }` if null / shopId mismatch).
- Must verify cookie shopId === shop.id.

### Staff QR printable
On shop settings (`app/(shop)/shop/settings/page.tsx` + component):
- New card/section when `onlineOrderingEnabled` (or always, with note): **QR สั่งออนไลน์**
- Server: build claim URL with `getBaseUrl()` + `/s/${slug}/enter?t=` + signed token; `renderQrDataUrl(url)` from `src/infrastructure/services/qr.ts`.
- Client component e.g. `OrderAccessQrCard.tsx`: show QR image, shop name, short Thai instructions (“ลูกค้าสแกนแล้วสั่งออนไลน์ได้บนมือถือ”), Print button (`window.print` or print-friendly CSS). Do not display raw token/secret.
- Optionally also link under kiosk/promote — settings is enough for V1.

### i18n
Add keys to `messages/th.json` and `messages/en.json` under `publicPages` / `shop` / `shopPages` as needed. If a client component needs a new namespace, add to `src/i18n/client-messages.ts` allowlist.

### Tests (required)
1. Unit: sign/verify order-access token — valid; expired fails; tampered fails; wrong slug/shopId fails.
2. Integration on `placeOnlineOrderAction` (extend `order-actions.integration.test.ts`):
   - without cookie → error (Thai about QR)
   - with valid `eo_order_<slug>` cookie for that shop → can proceed past gate (mock enough to succeed or at least pass gate; existing mocks for cookies in that file)
   - cookie for **other** slug / wrong shop → reject
3. Keep kiosk/counter tests green (ungated).

### Docs / seed
- Ensure staging demo shop (`slug=demo`) can show QR once online ordering enabled — no seed change required if settings UI generates QR live.
- Brief note in commit body / CHANGELOG optional.

### Out of scope
- Do not deploy Worker.
- Do not rotate secrets UI yet.
- Do not gate kiosk/counter.
- Do not add customer login.

## Quality bar
- Match existing style (server-only on auth helpers, `"use server"` actions).
- Run: targeted tests for new files + `npm test` if feasible; `npx tsc --noEmit` (if vinext cloudflare configs break tsc, stash them temporarily like prior session).
- Commit on `feat/online-order-fulfillment` with conventional message e.g. `feat(order): require shop QR scan for online ordering`.
- Do not push. Do not deploy.

When done, print short summary: files changed, cookie name, routes, how owner prints QR, test results.
