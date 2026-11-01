import "server-only";

import { cookies } from "next/headers";

import { container } from "@/src/infrastructure/di/container";
import { resolveRider } from "@/src/application/use-cases/rider/RiderUseCases";
import type { Rider } from "@/src/domain/entities";

/**
 * Rider app session. The cookie holds the rider's personal-link token; the DB
 * stores only its SHA-256 hash (riders.access_token_hash). So the session is
 * bound to the link: when the shop regenerates or revokes the link, the hash
 * changes and every existing cookie stops resolving immediately.
 */
export const RIDER_COOKIE = "eo_rider";
const MAX_AGE_S = 180 * 24 * 3600;

export function riderCookieHeader(token: string, secure: boolean): string {
  return `${RIDER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure ? "; Secure" : ""}`;
}

export function clearRiderCookieHeader(secure: boolean): string {
  return `${RIDER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

/** Raw token from the rider cookie (unvalidated), or null. */
export async function getRiderToken(): Promise<string | null> {
  return (await cookies()).get(RIDER_COOKIE)?.value ?? null;
}

/** The active rider for this device's cookie, or null (validated against the DB). */
export async function getSessionRider(): Promise<{ rider: Rider; token: string } | null> {
  const token = await getRiderToken();
  if (!token) return null;
  const rider = await resolveRider(container.riderRepository, token);
  return rider ? { rider, token } : null;
}

/** Token from a rider-cookie on a raw Request (route handlers). */
export function riderTokenFromRequest(req: Request): string | null {
  const m = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)eo_rider=([^;]+)/);
  return m ? m[1] : null;
}
