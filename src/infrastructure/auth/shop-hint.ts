/**
 * Non-sensitive, client-readable hint that this browser MAY hold an operator
 * session (es_session is httpOnly, so JS can't see it). The public shop header
 * only calls /api/shop/owner-check when this hint exists, so anonymous
 * customers make zero extra requests. Carries no identity — just "1".
 * Shared by server (set/clear) and client (read) — keep free of server-only.
 */
export const SHOP_HINT_COOKIE = "eo_shop_hint";
