import "server-only";

import { cookies } from "next/headers";

import {
  signOrderAccessToken,
  verifyOrderAccessToken,
} from "@/src/domain/services/order-access-token";
import { isProd } from "@/src/infrastructure/config/env";

/**
 * Shop-bound online-order access ("shop QR gate"): a device may order online
 * for a shop only after scanning that shop's order QR. The proof is an
 * HMAC-signed token stored in an httpOnly cookie scoped per shop slug —
 * mirrors the member-device cookie pattern in member.ts. No cookie state in
 * the DB: the signature IS the proof (no schema change).
 */

const PREFIX = "eo_order_";
const COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days after the claim
/** Claim-URL token freshness — the staff page regenerates on each render. */
export const CLAIM_TOKEN_TTL_S = 14 * 24 * 60 * 60; // 14 days

export function orderAccessCookieName(slug: string): string {
  return `${PREFIX}${slug}`;
}

/**
 * Signing secret for the access token. Fail closed: with neither var set,
 * nothing signs or verifies. Never log this value.
 */
function accessSecret(): string | null {
  const secret = process.env.ORDER_ACCESS_SECRET || process.env.CRON_SECRET;
  return secret || null;
}

/** Mint a short-lived claim token to embed in the shop's order QR URL. */
export function mintClaimToken(slug: string, shopId: string): string | null {
  const secret = accessSecret();
  if (!secret) return null;
  return signOrderAccessToken(
    { shopId, slug, exp: Math.floor(Date.now() / 1000) + CLAIM_TOKEN_TTL_S },
    secret,
  );
}

/** Verify a claim-URL token against a specific shop (claim route). */
export function verifyClaimToken(
  token: string,
  slug: string,
  shopId: string,
): boolean {
  const secret = accessSecret();
  if (!secret) return false;
  return (
    verifyOrderAccessToken(token, { shopId, slug, secret, now: new Date() }) !==
    null
  );
}

/**
 * Read the order-access gate for a shop slug. Returns the verified shopId when
 * this device scanned that shop's QR, else null. The shopId comes from the
 * signed payload itself (MAC-checked), then the caller compares it against the
 * DB shop — so a cookie minted for shop A can never pass for shop B.
 */
export async function getOrderAccess(
  slug: string,
): Promise<{ shopId: string } | null> {
  const token = (await cookies()).get(orderAccessCookieName(slug))?.value;
  if (!token) return null;
  const secret = accessSecret();
  if (!secret) return null;

  const m = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  let shopId: string;
  try {
    // The MAC check in verifyOrderAccessToken is what makes this read safe —
    // we only decode to feed back the shopId for the strict comparison.
    shopId = Buffer.from(m[1], "base64url").toString("utf8").split("|")[0] ?? "";
  } catch {
    return null;
  }
  if (!shopId) return null;

  const ok = verifyOrderAccessToken(token, {
    shopId,
    slug,
    secret,
    now: new Date(),
  });
  return ok ? { shopId } : null;
}

/** Set the order-access cookie for this shop on this device (claim route only). */
export async function setOrderAccessCookie(
  slug: string,
  shopId: string,
): Promise<void> {
  const secret = accessSecret();
  if (!secret) return; // fail closed: no secret → no grant
  const token = signOrderAccessToken(
    {
      shopId,
      slug,
      exp: Math.floor((Date.now() + COOKIE_TTL_MS) / 1000),
    },
    secret,
  );
  (await cookies()).set(orderAccessCookieName(slug), token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + COOKIE_TTL_MS),
  });
}

/**
 * Hard gate for the online-order action: throws (Thai message, surfaces to the
 * client as an error) when this device hasn't scanned that shop's QR, or the
 * cookie was minted for a different shop.
 */
export async function requireOrderAccess(
  slug: string,
  shopId: string,
): Promise<void> {
  const access = await getOrderAccess(slug);
  if (!access || access.shopId !== shopId) {
    throw new Error("ต้องสแกน QR ที่ร้านนี้ก่อนจึงจะสั่งออนไลน์ได้");
  }
}
