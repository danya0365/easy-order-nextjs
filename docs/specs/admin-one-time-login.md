# Admin one-time login links

- Platform admin (`/admin/shops` → "สร้างลิงก์ login ครั้งเดียว") issues a link for a shop:
  expiry 15m (default) / 1h / 24h, optionally pre-selecting one account.
- Token: 32 random bytes base64url; only SHA-256 hash stored (`admin_login_links`, migration 0017).
  URL shown once to the admin. Active links listed per shop with revoke.
- `/login/one-time?t=…` (public; noindex, `Referrer-Policy: no-referrer`, no-store):
  validates without consuming, lists active owner/staff accounts of that shop (masked email).
  Platform admins are never listed.
- Choosing an account POSTs a server action that re-validates and consumes atomically
  (`UPDATE … WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > now`), then creates a
  normal session and redirects to the role home. **2FA is bypassed** (admin-issued); the LINE
  login alert is not sent.
- Rate limits: failed page lookups 30 / 10 min / IP; consume attempts 10 / 10 min / IP.
- Audit: `one_time_login_link_created`, `_revoked`, `_used` (chosen user + issuing admin).

## Admin self-login links (kind = 'admin', migration 0018)

`node scripts/admin-login-link.mjs --env staging|prod --email <admin email> [--ttl 15m|1h|24h]`
inserts a `kind='admin'` row (shop_id null, target = that platform admin) using the DB creds in
`/workspace/secrets/easy-order-<env>-db.env`, audits `one_time_login_link_created` (actor_role
`cli`), and writes the URL only to `/workspace/secrets/admin-login-link-<env>.txt` (0600).
Opening it shows a confirm button (no account list); confirming consumes it atomically and
redirects to `/admin`. The /admin layout still enforces mandatory 2FA unless the hosted bypass
vars are set.
