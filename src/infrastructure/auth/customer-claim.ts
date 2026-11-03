import "server-only";

import {
  signCustomerClaim,
  verifyCustomerClaim,
} from "@/src/domain/services/customer-claim";

/**
 * Signing secret for customer-card claim links — same secret infra as the
 * shop QR gate (ORDER_ACCESS_SECRET, falling back to CRON_SECRET). Fail
 * closed: with neither set nothing signs or verifies. Never log this value.
 */
function claimSecret(): string | null {
  return process.env.ORDER_ACCESS_SECRET || process.env.CRON_SECRET || null;
}

/** Relative claim path for a customer's card QR, or null when no secret. */
export function customerClaimPath(slug: string, code: string): string | null {
  const secret = claimSecret();
  if (!secret) return null;
  const sig = signCustomerClaim(slug, code, secret);
  return `/s/${encodeURIComponent(slug)}/member/claim?code=${encodeURIComponent(code)}&sig=${sig}`;
}

/** Verify a claim link's signature for this shop slug + code. */
export function verifyCustomerClaimSig(slug: string, code: string, sig: string): boolean {
  const secret = claimSecret();
  if (!secret) return false;
  return verifyCustomerClaim(slug, code, sig, secret);
}
