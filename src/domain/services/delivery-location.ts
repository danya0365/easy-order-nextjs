/**
 * Delivery map-pin rules. Pure + client-safe (used by checkout UI, server use
 * case, rider + owner cards).
 */
export interface DeliveryPin {
  lat: number;
  lng: number;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Validate an optional pin: both-or-neither, finite, in range, not (0,0).
 * Returns the pin rounded to 6 dp (~10 cm) or null. Throws a Thai error.
 */
export function normalizeDeliveryPin(
  lat: number | null | undefined,
  lng: number | null | undefined,
): DeliveryPin | null {
  const hasLat = lat !== null && lat !== undefined;
  const hasLng = lng !== null && lng !== undefined;
  if (!hasLat && !hasLng) return null;
  if (hasLat !== hasLng) throw new Error("กรุณาปักหมุดตำแหน่งจัดส่งบนแผนที่");
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < -90 || a > 90 || b < -180 || b > 180) {
    throw new Error("ตำแหน่งบนแผนที่ไม่ถูกต้อง");
  }
  if (a === 0 && b === 0) throw new Error("ตำแหน่งบนแผนที่ไม่ถูกต้อง");
  return { lat: round6(a), lng: round6(b) };
}

/** Optional free-text landmark (≤120 chars). */
export function normalizeLandmark(raw: string | null | undefined): string | null {
  const v = raw?.trim() || null;
  if (v && v.length > 120) throw new Error("จุดสังเกตยาวเกินไป");
  return v;
}

/** Google Maps turn-by-turn directions to an exact coordinate. */
export function googleDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Best navigation link for an order: exact pin if present, else address search. */
export function orderNavigationUrl(o: {
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryAddress: string | null;
}): string | null {
  if (o.deliveryLat !== null && o.deliveryLng !== null) {
    return googleDirectionsUrl(o.deliveryLat, o.deliveryLng);
  }
  if (o.deliveryAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.deliveryAddress)}`;
  }
  return null;
}
