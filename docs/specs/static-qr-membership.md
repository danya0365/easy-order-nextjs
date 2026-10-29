# Spec: Static shop QR + membership gate (2026-10-29)

## Goal
Sales can print a **permanent Static QR** per shop. Customer scans → membership check → register if needed → **shop must approve before first online order**. Dynamic QR (`/s/[slug]/enter?t=…`) stays unchanged.

## Non-goals
- Do NOT change dynamic enter HMAC flow or require membership for kiosk/dynamic.
- Do NOT enable OTP providers by default (cost). OTP is a shop toggle, default OFF.
- Prod deploy only after แดน OK; ship to staging via develop.

## Unique identity
`(shop_id, phone)` — phone normalized digits. Same as `customers` table.

## Routes
| Path | Role |
|------|------|
| `/s/[slug]/enter?t=` | **UNCHANGED** dynamic claim → set `eo_order_<slug>` → `/order` |
| `/s/[slug]/join` | **NEW** static entry (no expiring `t`) |
| `/s/[slug]/join/register` | register name+phone (and OTP if shop enabled) |
| `/s/[slug]/join/pending` | waiting for shop approve |
| `/s/[slug]/join/rejected` | rejected state |

Static QR encodes absolute URL `https://<host>/s/<slug>/join`.

## Join flow
1. GET `/join`: resolve shop; if `!onlineOrderingEnabled` → friendly off page.
2. If device has `eo_member_<slug>` bound to customer with `onlineOrderStatus=approved` → `setOrderAccessCookie` + redirect `/order`.
3. If member `pending` → `/join/pending`.
4. If member `rejected` → `/join/rejected`.
5. Else → `/join/register`.

## Register
- Fields: displayName, phone (required).
- Create/find customer `(shopId, phone)`.
- Set `onlineOrderStatus=pending`, `onlineOrderRequestedAt=now` (new columns).
- Bind device (`customer_devices` + `eo_member_<slug>` cookie) like ClaimBindCode.
- OTP shop setting `memberOtpEnabled` default false:
  - OFF: go pending; shop approves manually.
  - ON (future/stub OK): verify OTP before creating pending membership; still require first-order approve unless product says OTP replaces approve — **keep first-order approve always** per แดน.
- Redirect pending.

## Shop approve UI
- `/shop/customers` (or section): list pending online-order members; Approve / Reject actions.
- Approve → `onlineOrderStatus=approved`; Reject → `rejected`.
- Optional: notify later (skip V1).

## Order gate (static path only)
- Placing online order still requires `eo_order_<slug>` cookie.
- Cookie for static path is granted only at `/join` when status=approved (step 2) OR after approve when member re-scans.
- Dynamic `/enter?t=` still grants cookie without membership.

## Schema (migration 0014)
On `customers` (or new `shop_members` if cleaner — prefer columns on customers to avoid dupe identity):
- `online_order_status` text not null default `'none'` — `none|pending|approved|rejected`
- `online_order_requested_at` text null
- `online_order_reviewed_at` text null
- `online_order_reviewed_by` text null (user id)

On `shops`:
- `member_otp_enabled` integer boolean not null default 0

## Shop settings UI
- Printable **Static QR** card (permanent `/join`) next to existing dynamic OrderAccessQrCard — label clearly "QR แปะหน้าร้าน (ถาวร)" vs "QR พิมพ์สด / หมุนเวียน".
- Toggle "ยืนยันสมาชิกด้วย OTP" default off + note about SMS cost.

## i18n
th + en keys under shopPages / join / customers.

## Tests
- Unit: join redirects by status; register creates pending; approve unlocks cookie grant.
- Do not break order-access-token / enter tests.

## Gitflow
feature → merge develop → deploy staging from develop → delete feature. Never deploy from feature.

---

# Anti-spam + revocable static QR (migration 0015)

Dynamic `/enter?t=` (HMAC, `order-access.ts`) is untouched by everything below.

## 1. Revocable join token
- `shops.static_join_token` (random 24 bytes, base64url via `generateStaticJoinToken`; migration backfills existing shops with `hex(randomblob(24))`, and `getStaticJoinToken` lazily fills any NULL). `shops.static_join_token_rotated_at`.
- QR/link: `/s/{slug}/join?k={token}` (shown in `StaticJoinQrCard`, settings tab).
- `/join` without/with wrong `k` → friendly "QR ไม่ถูกต้อง" page (200, HTML) — never register. Members with a valid `eo_member_<slug>` cookie (approved/pending/rejected) still pass without `k`.
- `k` is forwarded to `/join/register?k=` → hidden input → server action → `RegisterStaticMemberUseCase` re-validates with constant-time compare (`staticJoinTokenMatches`). Register page itself also re-checks `k`.
- Settings: "ยกเลิก QR เดิมและสร้างใหม่" (confirm dialog warns printed QR stops working) → `RotateStaticJoinTokenUseCase`, audit `static_join_token_rotated`.

## 2. Pause signups
- `shops.member_signup_paused` (default false). When on, `/join` shows "ร้านปิดรับสมาชิกใหม่ชั่วคราว" and register is rejected; existing members unaffected. Toggle next to the static QR card; audit `member_signup_paused_set`.

## 3. Rate limits
- Table `member_signup_attempts(shop_id, customer_id, ip_hash, device_id, phone, created_at)` — one row per NEW pending request. `ip_hash` = HMAC-SHA256(ORDER_ACCESS_SECRET|CRON_SECRET, ip) truncated; raw IP never stored. `device_id` = anonymous `eo_dev` cookie set at `/join`.
- Per shop: max **3** signups / 24h per ip_hash OR device → "ลงทะเบียนจากอุปกรณ์นี้บ่อยเกินไป".
- Per shop: max **20** open pending → "ร้านมีคำขอค้างมาก ลองใหม่ภายหลัง".
- Re-scanning with an already-open pending/approved phone just binds the device (no new attempt).

## 4. Turnstile
- Enabled only when site key (`TURNSTILE_SITE_KEY` or `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) AND `TURNSTILE_SECRET_KEY` exist: widget on register form (`captchaToken`) + server Siteverify. Absent → skipped with a log line.

## 5. Phone validation
- `^0[689]\d{8}$`; reject all-same digits, sequential runs (0812345678, 0123456789, 0987654321) and repeating units of 2–4 digits (0812121212).

## 6. Pending expiry
- Pending older than **48h** is marked `expired` (`online_order_status='expired'`) when the queue is read and treated as expired by the gate (device goes back to register, needs valid `k`). Hidden from queue.

## 7. Queue signals (shop customers page)
- Flags per pending row: same ip_hash >1 signup in 24h; phone previously rejected (`customers.online_order_rejected_at`); same device >1 signup in 24h. Suspicious rows sorted last.
- "ปฏิเสธทั้งหมดที่น่าสงสัย" → rejects all flagged rows. Per-row "บล็อกเบอร์" → `shop_blocked_phones` + reject if pending. Blocked phones cannot register at that shop.

## 8. Reject cooldown
- `customers.online_order_rejected_at` (kept across re-requests). Rejected phone can't re-register at the same shop for **30 days**.

## 9. New-member order limits (static path only)
- Customer with `online_order_status='approved'` and **no** completed/paid order yet: max **1** open order (pending/preparing/ready) and order total ≤ **1,000 THB** (`NEW_MEMBER_ORDER_POLICY`). After the first completed/paid order → full rights. Enforced in `PlaceOrderUseCase` for `channel="online"`. Dynamic-QR / kiosk customers (`status='none'`) unaffected.

## 10. OTP toggle — unchanged.

Constants: `src/domain/services/static-join-guard.ts`. Tests: `static-membership.integration.test.ts`.

## Per-shop member settings (`/shop/settings/members`)

Owners (or impersonating admins, via `requireShopWrite`) can edit, with audit
`member_settings_updated` (before/after). Stored as nullable `shops.member_*`
columns (migration 0016); NULL = default.

| Setting | Default | Range |
|---|---|---|
| New-member order cap (THB) | 1000 | 100–100000, 0 = no cap |
| New-member max open orders | 1 | 1–5 |
| Sign-ups per device/IP per day | 3 | 1–20 |
| Max pending requests | 20 | 5–200 |
| Pending expiry (hours) | 48 | 12–168 |
| Reject cooldown (days) | 30 | 0–365 |

Approval before first order is always on (not editable). The page also holds
the static QR card, rotate button, pause toggle and OTP toggle.
