import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { isProd } from "@/src/infrastructure/config/env";
import type { KnownAccount, User } from "@/src/domain/entities";
import type { Role } from "@/src/domain/types/roles";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "es_session";
const SESSION_TTL_DAYS = 7;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

// FB-style "accounts used on this device" — remembered emails (+role) so the
// login page can offer one-tap account selection. Holds NO credentials/session;
// httpOnly so the list isn't readable by client JS. Picking one still requires
// full OTP/password auth.
const ACCOUNTS_COOKIE = "es_accounts";
const ACCOUNTS_MAX = 5;
const ACCOUNTS_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Read and validate the current session. Returns the authenticated user, or
 * null when there is no valid session. This is the real authorization layer
 * (proxy.ts only does an optimistic cookie-presence check).
 */
export async function getSession(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const result = await container.sessionRepository.findValid(token, new Date());
  return result?.user ?? null;
}

/**
 * Require an authenticated user with one of the given roles. Redirects to
 * /login when unauthenticated, or to its role home when the role mismatches.
 * Call at the top of every protected layout/page and inside every action.
 */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (roles.length > 0 && !roles.includes(user.role)) {
    redirect("/login");
  }
  return user;
}

// Admin impersonation ("login as shop"). Stored in its own short-lived httpOnly
// cookie and honored ONLY for a platform_admin session. It is READ-WRITE: shop
// READ pages resolve via requireShopAccess() and shop WRITE actions via
// requireShopWrite(), both of which accept an impersonating admin as the acting
// owner of that shop. Accountability is preserved — `actor` stays the real admin
// (audit logs attribute changes to them) and start/stop is audit-logged.
const IMPERSONATE_COOKIE = "es_impersonate";
const IMPERSONATE_TTL_MS = 30 * 60_000; // 30 นาที

export interface Impersonation {
  shopId: string;
  by: string;
}

export interface ShopAccess {
  user: User;
  shopId: string;
  impersonating: boolean;
}

/** Begin impersonating a shop (admin only — caller must check the role). */
export async function startImpersonation(
  shopId: string,
  byAdminId: string,
): Promise<void> {
  const exp = Date.now() + IMPERSONATE_TTL_MS;
  (await cookies()).set(
    IMPERSONATE_COOKIE,
    JSON.stringify({ shopId, by: byAdminId, exp }),
    {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      expires: new Date(exp),
    },
  );
}

export async function stopImpersonation(): Promise<void> {
  (await cookies()).delete(IMPERSONATE_COOKIE);
}

/** The active impersonation, or null. Honored ONLY for a platform_admin session. */
export async function getImpersonation(): Promise<Impersonation | null> {
  const raw = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
  if (!raw) return null;
  let parsed: { shopId?: unknown; by?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof parsed.shopId !== "string" ||
    typeof parsed.by !== "string" ||
    typeof parsed.exp !== "number" ||
    parsed.exp < Date.now()
  ) {
    return null;
  }
  // Only a platform_admin may impersonate — a forged cookie from any other
  // session is ignored.
  const user = await getSession();
  if (user?.role !== "platform_admin") return null;
  return { shopId: parsed.shopId, by: parsed.by };
}

/**
 * Read access to a shop's screens: the owner's own shop, or a platform_admin
 * impersonating one. Use in shop READ pages + the (shop) layout instead of
 * requireRole("shop_owner"). For WRITES use requireShopWrite() below.
 */
export async function requireShopAccess(): Promise<ShopAccess> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "shop_owner") {
    if (!user.shopId) redirect("/login");
    return { user, shopId: user.shopId, impersonating: false };
  }
  if (user.role === "platform_admin") {
    const imp = await getImpersonation();
    if (imp) return { user, shopId: imp.shopId, impersonating: true };
    redirect("/admin/shops");
  }
  redirect("/login");
}

export interface ShopWriteAccess {
  /**
   * The real authenticated user performing the write — the shop owner, or the
   * impersonating platform_admin (NEVER a synthesized owner). Use for audit
   * actorUserId/actorRole so logs attribute the change to the real actor.
   */
  actor: User;
  /** The shop being written to (the owner's shop, or the impersonated shop). */
  shopId: string;
  /** True when a platform_admin is acting via impersonation. */
  impersonating: boolean;
}

/**
 * Authorize a WRITE to a shop's data: the shop_owner of that shop, or a
 * platform_admin actively impersonating it ("login as shop" → act on their
 * behalf). Replaces requireRole("shop_owner")/ownerShopId in shop-scoped
 * mutating actions. Impersonation is now read-write (admins can fix a shop's
 * data for them); accountability is preserved because `actor` stays the real
 * admin and impersonation start/stop is audit-logged. Throws (not redirect) so
 * the calling action returns a clean { error } instead of swallowing a redirect.
 */
export async function requireShopWrite(): Promise<ShopWriteAccess> {
  const user = await getSession();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  if (user.role === "shop_owner") {
    if (!user.shopId) throw new Error("บัญชีนี้ไม่ได้ผูกกับร้านค้า");
    return { actor: user, shopId: user.shopId, impersonating: false };
  }
  if (user.role === "platform_admin") {
    const imp = await getImpersonation();
    if (imp) return { actor: user, shopId: imp.shopId, impersonating: true };
  }
  throw new Error("ไม่มีสิทธิ์แก้ไขข้อมูลร้านนี้");
}

/** Assert the user owns the given shop (platform_admin bypasses). */
export function requireShopScope(user: User, shopId: string): void {
  if (user.role === "platform_admin") return;
  if (user.shopId !== shopId) {
    throw new Error("Forbidden: shop scope mismatch");
  }
}

/** Assert a branch_staff is acting within their own branch. */
export function requireBranchScope(user: User, branchId: string): void {
  if (user.role === "platform_admin" || user.role === "shop_owner") return;
  if (user.branchId !== branchId) {
    throw new Error("Forbidden: branch scope mismatch");
  }
}

/** The current session token (cookie value), or null. */
export async function getCurrentSessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

/** Create a session row (capturing device context) and set the httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    null;
  const userAgent = h.get("user-agent")?.slice(0, 400) || null;
  const session = await container.sessionRepository.create({
    userId,
    expiresAt: expiresAt.toISOString(),
    userAgent,
    ip,
  });
  (await cookies()).set(COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Pending 2FA: set after step-1 (password/OTP) succeeds for a 2FA-enabled
// account, BEFORE a real session exists. Short-lived + httpOnly; holds only the
// userId who already proved step 1. The session is created only after the TOTP
// challenge passes.
const PENDING_2FA_COOKIE = "es_pending_2fa";
const PENDING_2FA_TTL_MS = 5 * 60_000; // 5 นาที

export async function setPendingTwoFactor(userId: string): Promise<void> {
  const exp = Date.now() + PENDING_2FA_TTL_MS;
  (await cookies()).set(PENDING_2FA_COOKIE, JSON.stringify({ userId, exp }), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function getPendingTwoFactor(): Promise<string | null> {
  const raw = (await cookies()).get(PENDING_2FA_COOKIE)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { userId?: unknown; exp?: unknown };
    if (typeof v.userId !== "string" || typeof v.exp !== "number" || v.exp < Date.now()) {
      return null;
    }
    return v.userId;
  } catch {
    return null;
  }
}

export async function clearPendingTwoFactor(): Promise<void> {
  (await cookies()).delete(PENDING_2FA_COOKIE);
}

/** Delete the current session row and clear the cookie. Server Actions only. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await container.sessionRepository.delete(token);
    store.delete(COOKIE_NAME);
  }
}

function parseAccounts(raw: string | undefined): KnownAccount[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (a): a is KnownAccount =>
          !!a &&
          typeof (a as KnownAccount).email === "string" &&
          typeof (a as KnownAccount).role === "string",
      )
      .slice(0, ACCOUNTS_MAX);
  } catch {
    return [];
  }
}

function writeAccounts(
  store: Awaited<ReturnType<typeof cookies>>,
  accounts: KnownAccount[],
): void {
  if (accounts.length === 0) {
    store.delete(ACCOUNTS_COOKIE);
    return;
  }
  store.set(ACCOUNTS_COOKIE, JSON.stringify(accounts), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + ACCOUNTS_TTL_MS),
  });
}

/** Accounts previously used to sign in on this device, most-recent first. */
export async function getKnownAccounts(): Promise<KnownAccount[]> {
  const store = await cookies();
  return parseAccounts(store.get(ACCOUNTS_COOKIE)?.value);
}

/** Record a successful sign-in so it can be offered next time (most-recent first). */
export async function rememberAccount(account: KnownAccount): Promise<void> {
  const store = await cookies();
  const existing = parseAccounts(store.get(ACCOUNTS_COOKIE)?.value);
  const next = [
    account,
    ...existing.filter((a) => a.email !== account.email),
  ].slice(0, ACCOUNTS_MAX);
  writeAccounts(store, next);
}

/** Remove one remembered account from this device. */
export async function forgetAccount(email: string): Promise<void> {
  const store = await cookies();
  const next = parseAccounts(store.get(ACCOUNTS_COOKIE)?.value).filter(
    (a) => a.email !== email,
  );
  writeAccounts(store, next);
}

export { COOKIE_NAME };
