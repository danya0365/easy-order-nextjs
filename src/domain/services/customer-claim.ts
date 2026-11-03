/**
 * Customer-card claim link ("scan my customer QR with the phone camera").
 *
 * The staff CRM page renders a QR that encodes an https URL
 * `/s/<slug>/member/claim?code=<publicCode>&sig=<hmac>`. The signature binds
 * the code to the shop slug so a code can't be replayed on another shop or
 * guessed. Pure (secret injected by the caller) → unit-testable domain code.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const CODE_RE = /^[A-Za-z0-9_-]{4,64}$/;

/** HMAC signature for a customer claim link (url-safe, 22 chars). */
export function signCustomerClaim(slug: string, code: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`customer-claim|v1|${slug}|${code}`)
    .digest("base64url")
    .slice(0, 22);
}

/** Constant-time verify of a claim signature. False on any mismatch. */
export function verifyCustomerClaim(
  slug: string,
  code: string,
  sig: string,
  secret: string,
): boolean {
  if (!CODE_RE.test(code) || typeof sig !== "string" || sig.length !== 22) return false;
  const expected = Buffer.from(signCustomerClaim(slug, code, secret));
  const actual = Buffer.from(sig);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Extract the customer's opaque code from a scanned / pasted value. Accepts a
 * bare code, the claim URL (`…/member/claim?code=<code>&sig=…`) or the legacy
 * `…/s/<slug>?c=<code>` form. Non-URL input is returned trimmed.
 */
export function extractCustomerCode(scanned: string): string {
  const text = (scanned ?? "").trim();
  if (!/^https?:\/\//i.test(text)) return text;
  try {
    const url = new URL(text);
    const c = url.searchParams.get("code") ?? url.searchParams.get("c");
    if (c) return c.trim();
  } catch {
    // not a URL — fall through
  }
  return text;
}
