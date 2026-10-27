/**
 * HMAC-signed access token for online ordering ("shop QR gate").
 *
 * A shop's device-bound claim URL carries `?t=<token>`; verifying proves the
 * device scanned THAT shop's QR. This module is pure (no I/O, no cookies, no
 * DI) so it lives in the domain layer and is unit-testable.
 *
 * Format (compact, url-safe): `v1.<base64url(payload)>.<base64url(mac)>`
 * where payload is `shopId|slug|exp` (exp = unix seconds). The secret is
 * injected by the caller so tests don't need env vars.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface OrderAccessTokenParts {
  shopId: string;
  slug: string;
  /** Expiry in unix seconds. */
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(secret: string, payloadB64: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/** Sign an access token for one shop's online-order gate. */
export function signOrderAccessToken(
  parts: OrderAccessTokenParts,
  secret: string,
): string {
  const payload = `${parts.shopId}|${parts.slug}|${parts.exp}`;
  const payloadB64 = b64url(payload);
  return `v1.${payloadB64}.${hmac(secret, payloadB64)}`;
}

/**
 * Verify a token for a given shop+slug+time. Returns null on ANY mismatch —
 * wrong signature, tampering, expiry, or shop/slug binding.
 */
export function verifyOrderAccessToken(
  token: string,
  opts: { shopId: string; slug: string; secret: string; now: Date },
): OrderAccessTokenParts | null {
  const m = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  const [, payloadB64, macB64] = m;

  const expected = Buffer.from(hmac(opts.secret, payloadB64), "base64url");
  let actual: Buffer;
  try {
    actual = Buffer.from(macB64, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  const parts = Buffer.from(payloadB64, "base64url").toString("utf8").split("|");
  if (parts.length !== 3) return null;
  const [shopId, slug, expRaw] = parts;
  const exp = Number(expRaw);
  if (!shopId || !slug || !Number.isFinite(exp)) return null;
  if (shopId !== opts.shopId || slug !== opts.slug) return null;
  if (exp <= Math.floor(opts.now.getTime() / 1000)) return null;

  return { shopId, slug, exp };
}
