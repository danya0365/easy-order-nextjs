/**
 * Rider session cookie value (pure):
 *   `v2.<accountId>.<epoch>.<m1~m2~…>.<sig>`
 * sig = HMAC-SHA256(secret, "rider-session:<accountId>:<epoch>:<m1~m2~…>").
 *
 * The session is bound to a global rider ACCOUNT but only *scoped* to the shop
 * memberships this device has proven by opening that shop's personal link.
 * So whoever holds one shop's link (e.g. that shop's owner) can never see the
 * rider's other shops. Bumping the account's session_epoch signs every device
 * out. Legacy cookies (a raw per-shop link token) are handled by the caller.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const PREFIX = "v2";
const ID = /^[A-Za-z0-9_-]{1,64}$/;
/** Hard cap so the cookie stays small. */
export const MAX_SCOPE = 30;

export interface RiderSessionPayload {
  accountId: string;
  epoch: number;
  /** Membership (riders.id) ids proven on this device. */
  scope: string[];
}

function sign(p: RiderSessionPayload, secret: string): string {
  return createHmac("sha256", secret)
    .update(`rider-session:${p.accountId}:${p.epoch}:${p.scope.join("~")}`)
    .digest("base64url");
}

export function signRiderSession(p: RiderSessionPayload, secret: string): string {
  const scope = [...new Set(p.scope)].slice(-MAX_SCOPE);
  const norm = { ...p, scope };
  return `${PREFIX}.${p.accountId}.${p.epoch}.${scope.join("~")}.${sign(norm, secret)}`;
}

export function isRiderSessionValue(v: string): boolean {
  return v.startsWith(`${PREFIX}.`);
}

/** Parse + verify; returns the payload or null. */
export function verifyRiderSession(value: string, secret: string): RiderSessionPayload | null {
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== PREFIX) return null;
  const [, accountId, epochStr, scopeStr, sig] = parts;
  if (!ID.test(accountId) || !/^\d{1,9}$/.test(epochStr)) return null;
  const scope = scopeStr ? scopeStr.split("~") : [];
  if (scope.length > MAX_SCOPE || !scope.every((s) => ID.test(s))) return null;
  const p = { accountId, epoch: Number(epochStr), scope };
  const expect = Buffer.from(sign(p, secret));
  const got = Buffer.from(sig);
  if (expect.length !== got.length || !timingSafeEqual(expect, got)) return null;
  return p;
}
