import { randomBytes, timingSafeEqual } from "node:crypto";

/** Fixed anti-spam constants (per-shop values: member-policy.ts; these are fallbacks) for static-QR membership (`/s/[slug]/join`). */
export const STATIC_JOIN_POLICY = {
  /** Max successful signups per device OR ip_hash per shop per 24h. */
  maxSignupsPerDevicePerDay: 3,
  /** Max open (non-expired) pending requests per shop. */
  maxOpenPendingPerShop: 20,
  /** Pending requests auto-expire after this long. */
  pendingTtlMs: 48 * 60 * 60 * 1000,
  /** A rejected phone cannot re-register at the same shop for this long. */
  rejectCooldownMs: 30 * 24 * 60 * 60 * 1000,
  /** Window for "same ip_hash" / device signals in the shop queue. */
  signalWindowMs: 24 * 60 * 60 * 1000,
} as const;

/** Random URL-safe token (24 bytes → 32 base64url chars). */
export function generateStaticJoinToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Constant-time token compare; false on missing/length mismatch. */
export function staticJoinTokenMatches(
  expected: string | null | undefined,
  provided: string | null | undefined,
): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) {
    // Still burn a compare to keep timing flat-ish.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Thai mobile: 10 digits starting 06/08/09. */
export function isValidThaiMobile(digits: string): boolean {
  return /^0[689]\d{8}$/.test(digits);
}

/**
 * Obvious junk numbers: all-same digits after the prefix, sequential runs,
 * or short repeating patterns (e.g. 0812121212, 0898989898).
 */
export function isSuspiciousPhone(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return true;
  const rest = digits.slice(2); // after "0X"
  if (/^(\d)\1+$/.test(rest)) return true;
  const seqs = ["0123456789", "1234567890", "9876543210", "0987654321"];
  for (const s of seqs) {
    if (s.includes(digits)) return true;
  }
  // Ascending/descending run covering the last 8 digits (0812345678).
  const asc = "01234567890123456789";
  const desc = "98765432109876543210";
  if (asc.includes(rest) || desc.includes(rest)) return true;
  // Repeating unit of length 2–4 covering the rest (12121212, 123123..).
  for (let n = 2; n <= 4; n++) {
    const unit = rest.slice(0, n);
    const rep = unit.repeat(Math.ceil(rest.length / n)).slice(0, rest.length);
    if (rep === rest) return true;
  }
  return false;
}

export function isPendingExpired(
  requestedAt: string | null | undefined,
  now: Date,
  ttlMs: number = STATIC_JOIN_POLICY.pendingTtlMs,
): boolean {
  if (!requestedAt) return false;
  return now.getTime() - new Date(requestedAt).getTime() > ttlMs;
}
