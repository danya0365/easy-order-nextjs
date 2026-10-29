"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { requireRole } from "@/src/infrastructure/auth/session";
import {
  AdminUserError,
  AdminUserManagementUseCase,
} from "@/src/application/use-cases/admin/AdminUserManagement";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp, getUserAgent } from "@/src/presentation/lib/request-ip";

export interface AdminUserActionState {
  error?: string;
  ok?: boolean;
}

const OPS = [
  "suspend",
  "activate",
  "setOwner",
  "setStaff",
  "promoteAdmin",
  "demoteAdmin",
  "grantSuper",
  "revokeSuper",
] as const;
type Op = (typeof OPS)[number];

const AUDIT: Record<Op, string> = {
  suspend: AUDIT_ACTIONS.userSuspended,
  activate: AUDIT_ACTIONS.userActivated,
  setOwner: AUDIT_ACTIONS.userRoleChanged,
  setStaff: AUDIT_ACTIONS.userRoleChanged,
  promoteAdmin: AUDIT_ACTIONS.platformAdminGranted,
  demoteAdmin: AUDIT_ACTIONS.platformAdminRevoked,
  grantSuper: AUDIT_ACTIONS.superadminGranted,
  revokeSuper: AUDIT_ACTIONS.superadminRevoked,
};

/** Single dispatcher for /admin/users mutations. All guards are server-side. */
export async function adminUserAction(
  _prev: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  const t = await getTranslations("adminUsers");
  const actor = await requireRole("platform_admin");
  const op = String(formData.get("op") ?? "") as Op;
  const userId = String(formData.get("userId") ?? "");
  if (!OPS.includes(op) || !userId) return { error: t("errInvalid") };
  const uc = new AdminUserManagementUseCase(
    container.userRepository,
    container.adminUserRepository,
    container.sessionRepository,
    container.branchRepository,
  );
  try {
    const before = await container.userRepository.findById(userId);
    let after;
    switch (op) {
      case "suspend": after = await uc.suspend(actor.id, userId); break;
      case "activate": after = await uc.activate(actor.id, userId); break;
      case "setOwner": after = await uc.changeShopRole(actor.id, userId, "shop_owner"); break;
      case "setStaff":
        after = await uc.changeShopRole(actor.id, userId, "branch_staff", String(formData.get("branchId") ?? ""));
        break;
      case "promoteAdmin": after = await uc.promoteToAdmin(actor.id, userId); break;
      case "demoteAdmin":
        after = await uc.demoteAdmin(actor.id, userId, String(formData.get("shopId") ?? ""));
        break;
      case "grantSuper": after = await uc.grantSuperadmin(actor.id, userId); break;
      case "revokeSuper": after = await uc.revokeSuperadmin(actor.id, userId); break;
    }
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT[op],
      shopId: after.shopId ?? before?.shopId ?? null,
      targetType: "user",
      targetId: userId,
      ip: await getClientIp(),
      userAgent: await getUserAgent(),
      metadata: {
        op,
        email: after.email,
        before: { role: before?.role, isActive: before?.isActive, isSuperadmin: !!before?.isSuperadmin, shopId: before?.shopId, branchId: before?.branchId },
        after: { role: after.role, isActive: after.isActive, isSuperadmin: !!after.isSuperadmin, shopId: after.shopId, branchId: after.branchId },
      },
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AdminUserError) return { error: t(`err_${e.code}`) };
    return { error: (e as Error).message };
  }
}
