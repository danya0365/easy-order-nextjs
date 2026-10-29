import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Allowed lifetimes for an admin one-time login link (max 24h). */
export const ONE_TIME_LOGIN_EXPIRY = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
} as const;
export type OneTimeLoginExpiry = keyof typeof ONE_TIME_LOGIN_EXPIRY;
export const DEFAULT_ONE_TIME_LOGIN_EXPIRY: OneTimeLoginExpiry = "15m";

export function isOneTimeLoginExpiry(v: unknown): v is OneTimeLoginExpiry {
  return typeof v === "string" && v in ONE_TIME_LOGIN_EXPIRY;
}

/** 32 random bytes, base64url (43 chars). */
export function generateOneTimeLoginToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOneTimeLoginToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Plausible token shape — rejects junk before touching the DB. */
export function isWellFormedToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}

export function hashesEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** "somchai@gmail.com" → "so*****@gmail.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const keep = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${keep}${"*".repeat(Math.max(3, local.length - keep.length))}@${domain}`;
}
