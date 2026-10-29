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
