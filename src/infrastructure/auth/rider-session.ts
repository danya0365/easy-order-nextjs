import "server-only";

import { cookies } from "next/headers";

import { requestMemo } from "@/src/infrastructure/request/request-memo";
import { container } from "@/src/infrastructure/di/container";
import {
  RiderLinkUseCases,
  resolveRider,
  resolveRiderSession,
  type RiderSession,
} from "@/src/application/use-cases/rider/RiderUseCases";
import {
  isRiderSessionValue,
  signRiderSession,
  verifyRiderSession,
  type RiderSessionPayload,
} from "@/src/domain/services/rider-session-token";

/**
 * Rider app session = a global rider ACCOUNT, scoped to the shop memberships
 * this device proved by opening each shop's personal link (see
 * rider-session-token.ts). Cookie value: signed `v2.…`. Legacy cookies that
 * hold a raw per-shop link token still work (scope = that one shop).
 */
export const RIDER_COOKIE = "eo_rider";
/** Pending invitation (raw link token) while the rider is on the confirm page. */
export const RIDER_INVITE_COOKIE = "eo_rider_invite";
const MAX_AGE_S = 180 * 24 * 3600;
const INVITE_MAX_AGE_S = 15 * 60;

function secret(): string | null {
  return process.env.ORDER_ACCESS_SECRET || process.env.CRON_SECRET || null;
}

/** Set-Cookie for a (re)signed account session. Null when no signing secret is configured. */
export function riderSessionCookieHeader(p: RiderSessionPayload, secure: boolean): string | null {
  const s = secret();
  if (!s) return null;
  return `${RIDER_COOKIE}=${signRiderSession(p, s)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure ? "; Secure" : ""}`;
}

/** Legacy: cookie = raw per-shop link token (kept for fallback when no secret is set). */
export function riderCookieHeader(token: string, secure: boolean): string {
  return `${RIDER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure ? "; Secure" : ""}`;
}

export function clearRiderCookieHeader(secure: boolean): string {
  return `${RIDER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function riderInviteCookieHeader(token: string, secure: boolean): string {
  return `${RIDER_INVITE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${INVITE_MAX_AGE_S}${secure ? "; Secure" : ""}`;
}

export function clearRiderInviteCookieHeader(secure: boolean): string {
  return `${RIDER_INVITE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

/** Cookie value → validated session (signed v2 or legacy link token). */
export async function sessionFromCookieValue(value: string | null | undefined): Promise<RiderSession | null> {
  if (!value) return null;
  return requestMemo(`rider-session:${value}`, async () => {
    const repo = container.riderRepository;
    if (isRiderSessionValue(value)) {
      const s = secret();
      const payload = s ? verifyRiderSession(value, s) : null;
      return payload ? resolveRiderSession(repo, payload) : null;
    }
    const m = await resolveRider(repo, value);
    if (!m || !m.accountId || m.status !== "approved") return null;
    const acct = await repo.findAccountById(m.accountId);
    if (!acct) return null;
    return resolveRiderSession(repo, { accountId: acct.id, epoch: acct.sessionEpoch, scope: [m.id] });
  });
}

function cookieFrom(req: Request, name: string): string | null {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** The rider session for this request (RSC / pages). */
export async function getRiderSession(): Promise<RiderSession | null> {
  return sessionFromCookieValue((await cookies()).get(RIDER_COOKIE)?.value ?? null);
}

/** The rider session from a raw Request (route handlers). */
export function riderSessionFromRequest(req: Request): Promise<RiderSession | null> {
  return sessionFromCookieValue(cookieFrom(req, RIDER_COOKIE));
}

export async function getRiderInviteToken(): Promise<string | null> {
  return (await cookies()).get(RIDER_INVITE_COOKIE)?.value ?? null;
}

export function riderInviteTokenFromRequest(req: Request): string | null {
  return cookieFrom(req, RIDER_INVITE_COOKIE);
}

/** Shop-link (login + invitation) use cases wired to the container. */
export function riderLinkUseCases(): RiderLinkUseCases {
  return new RiderLinkUseCases(
    container.riderRepository,
    async (shopId) => (await container.shopRepository.findById(shopId))?.name ?? "",
  );
}
