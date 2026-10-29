import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/** Anonymous per-device id (pre-registration) for signup rate limits. */
export const DEVICE_COOKIE = "eo_dev";
const DEVICE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function newDeviceId(): string {
  return randomBytes(16).toString("base64url");
}

export const deviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(DEVICE_TTL_MS / 1000),
};

/** Read (or create + set, in Server Actions) the anonymous device id. */
export async function getOrSetDeviceId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
  const id = newDeviceId();
  try {
    jar.set(DEVICE_COOKIE, id, deviceCookieOptions);
  } catch {
    // Not writable in this context — fine, IP limit still applies.
  }
  return id;
}

/**
 * HMAC the client IP with a server secret so the raw IP is never stored.
 * Uses the existing ORDER_ACCESS_SECRET / CRON_SECRET (no new secret needed).
 */
export function hashClientIp(ip: string): string | null {
  if (!ip || ip === "unknown") return null;
  const secret =
    process.env.ORDER_ACCESS_SECRET || process.env.CRON_SECRET || "eo-ip-v1";
  return createHmac("sha256", secret)
    .update(`ip:${ip}`)
    .digest("base64url")
    .slice(0, 32);
}
