/**
 * Printed order-QR expiry tracking. The order QR embeds a claim token valid
 * for 14 days from when the page rendered it (CLAIM_TOKEN_TTL_S). There is no
 * DB record of prints (no schema change), so the print button stores the
 * printed token's expiry in localStorage — status is per device/browser.
 */
export const ORDER_QR_WARN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type OrderQrStatus =
  | { kind: "unknown" }
  | { kind: "expired"; days: number }
  | { kind: "soon"; days: number }
  | { kind: "ok"; days: number };

export function orderQrStorageKey(shopId: string): string {
  return `eo_orderqr_exp:${shopId}`;
}

export function orderQrStatus(expMs: number | null, nowMs: number): OrderQrStatus {
  if (expMs == null || !Number.isFinite(expMs)) return { kind: "unknown" };
  const left = expMs - nowMs;
  if (left <= 0) return { kind: "expired", days: Math.floor((nowMs - expMs) / DAY_MS) };
  const days = Math.ceil(left / DAY_MS);
  return days <= ORDER_QR_WARN_DAYS ? { kind: "soon", days } : { kind: "ok", days };
}
