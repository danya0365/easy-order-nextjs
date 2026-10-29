"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import {
  createSession,
  destroySession,
  getCurrentSessionToken,
  rememberAccount,
  requireRole,
  stopImpersonation,
} from "@/src/infrastructure/auth/session";
import {
  ConsumeOneTimeLoginLinkUseCase,
  CreateOneTimeLoginLinkUseCase,
} from "@/src/application/use-cases/auth/OneTimeLoginUseCases";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { isOneTimeLoginExpiry } from "@/src/domain/services/one-time-login";
import { ROLE_HOME } from "@/src/domain/types/roles";
import { getClientIp, getUserAgent } from "@/src/presentation/lib/request-ip";
import { getBaseUrl } from "@/src/presentation/lib/base-url";

export interface OneTimeLinkState {
  error?: string;
  /** Shown to the admin exactly once — never persisted. */
  url?: string;
  expiresAt?: string;
}

const deps = () =>
  [
    container.adminLoginLinkRepository,
    container.shopRepository,
    container.userRepository,
  ] as const;

/** Platform admin: issue a one-time login link for a shop. */
export async function createOneTimeLoginLinkAction(
  shopId: string,
  _prev: OneTimeLinkState,
  formData: FormData,
): Promise<OneTimeLinkState> {
  try {
    const admin = await requireRole("platform_admin");
    const expiry = formData.get("expiry") ?? "15m";
    if (!isOneTimeLoginExpiry(expiry)) throw new Error("ระยะเวลาหมดอายุไม่ถูกต้อง");
    const targetUserId = String(formData.get("targetUserId") ?? "") || null;
    const { token, link } = await new CreateOneTimeLoginLinkUseCase(...deps()).execute({
      shopId,
      adminId: admin.id,
      expiry,
      targetUserId,
    });
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.oneTimeLoginLinkCreated,
      shopId,
      targetType: "admin_login_link",
      targetId: link.id,
      ip: await getClientIp(),
      userAgent: await getUserAgent(),
      metadata: { expiry, expiresAt: link.expiresAt, targetUserId },
    });
    revalidatePath("/admin/shops");
    return {
      url: `${await getBaseUrl()}/login/one-time?t=${token}`,
      expiresAt: link.expiresAt,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Platform admin: revoke an unused link. */
export async function revokeOneTimeLoginLinkAction(linkId: string): Promise<void> {
  const admin = await requireRole("platform_admin");
  const link = await container.adminLoginLinkRepository.findById(linkId);
  if (!link) return;
  const changed = await container.adminLoginLinkRepository.revoke(
    linkId,
    new Date().toISOString(),
  );
  if (changed) {
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.oneTimeLoginLinkRevoked,
      shopId: link.shopId,
      targetType: "admin_login_link",
      targetId: link.id,
      ip: await getClientIp(),
    });
  }
  revalidatePath("/admin/shops");
}

export interface ConsumeState {
  error?: string;
}

const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 10 * 60_000;

/** Public: burn the link and sign in as the chosen shop account (2FA bypassed — admin-issued). */
export async function consumeOneTimeLoginAction(
  _prev: ConsumeState,
  formData: FormData,
): Promise<ConsumeState> {
  const ip = await getClientIp();
  const rl = await container.rateLimitRepository.hit(
    `otl:ip:${ip}`,
    ATTEMPT_LIMIT,
    ATTEMPT_WINDOW_MS,
  );
  if (!rl.allowed) {
    return { error: `พยายามหลายครั้งเกินไป ลองใหม่ในอีก ${rl.retryAfterSec} วินาที` };
  }
  let home: string;
  try {
    const { user, link } = await new ConsumeOneTimeLoginLinkUseCase(...deps()).execute(
      formData.get("t"),
      String(formData.get("userId") ?? ""),
    );
    await container.auditLogger.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.oneTimeLoginLinkUsed,
      shopId: link.shopId,
      targetType: "admin_login_link",
      targetId: link.id,
      ip,
      userAgent: await getUserAgent(),
      metadata: { issuedBy: link.createdBy, chosenUserId: user.id, role: user.role },
    });
    if (await getCurrentSessionToken()) await destroySession();
    await stopImpersonation();
    await rememberAccount({ email: user.email, role: user.role });
    await createSession(user.id);
    home = ROLE_HOME[user.role];
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(home);
}
