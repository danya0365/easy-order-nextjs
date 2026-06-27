"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import {
  assertShopActive,
  getBillingState,
} from "@/src/infrastructure/auth/billing-guard";
import {
  PAUSE_MAX_PER_30D,
  PAUSE_CAP_WINDOW_MS,
  PAUSE_COOLDOWN_MS,
} from "@/src/domain/services/subscription-status";
import { UpdateShopSettingsUseCase } from "@/src/application/use-cases/shop/UpdateShopSettingsUseCase";
import { CreateBranchUseCase } from "@/src/application/use-cases/shop/CreateBranchUseCase";
import { UpdateBranchLocationUseCase } from "@/src/application/use-cases/shop/UpdateBranchLocationUseCase";
import { CreateStaffUseCase } from "@/src/application/use-cases/shop/CreateStaffUseCase";
import { PauseShopUseCase } from "@/src/application/use-cases/billing/PauseShopUseCase";
import { ResumeShopUseCase } from "@/src/application/use-cases/billing/ResumeShopUseCase";
import { ResetPasswordUseCase } from "@/src/application/use-cases/auth/ResetPasswordUseCase";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { assertPasswordAcceptable } from "@/src/application/use-cases/auth/password-policy";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import type { Page } from "@/src/application/repositories/pagination";
import type { AuditLog } from "@/src/domain/entities";

export interface FormState {
  error?: string;
  success?: string;
}

// Abuse guard-rails for "temporarily close shop" — cap + cooldown are shared
// with the UI (PAUSE_* live in the domain). The economic loophole (stretching one
// paid day across calendar days by closing off-hours) is already neutralized by
// whole-day-floor crediting in resumeDueDate; these add visibility + churn limits.

/** Owner temporarily closes their shop (freezes billing days). */
export async function pauseMyShopAction(): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();

    // Only enforce quotas on a real active→paused transition (skip no-ops).
    const { status } = await getBillingState(shopId);
    if (status.isPaused) return {}; // already closed — nothing to do
    if (status.isSuspended) {
      return { error: "ร้านถูกระงับอยู่ ไม่สามารถปิดชั่วคราวได้" };
    }

    // Cooldown: at most one closure per 24h (no admin alert — just "wait").
    const cd = await container.rateLimitRepository.hit(
      `shop_pause_cd:${shopId}`,
      1,
      PAUSE_COOLDOWN_MS,
    );
    if (!cd.allowed) {
      const hrs = Math.max(1, Math.ceil(cd.retryAfterSec / 3600));
      return {
        error: `เพิ่งปิด/เปิดร้านไปไม่นาน กรุณารออีกประมาณ ${hrs} ชม. ก่อนปิดอีกครั้ง`,
      };
    }

    // Monthly cap: alerts admins + owner once when the threshold trips.
    const ip = await getClientIp();
    const cap = await container.sensitiveActionGuard.check({
      key: `shop_pause_cap:${shopId}`,
      limit: PAUSE_MAX_PER_30D,
      windowMs: PAUSE_CAP_WINDOW_MS,
      shopId,
      actorUserId: actor.id,
      ip,
      alertTitle: "⚠️ ร้านปิดชั่วคราวบ่อยผิดปกติ",
      alertBody: `ร้านหนึ่งปิดชั่วคราวเกิน ${PAUSE_MAX_PER_30D} ครั้งใน 30 วัน — อาจกำลังเลี่ยงการนับวันใช้งาน`,
    });
    if (!cap.allowed) {
      return {
        error: `เดือนนี้ปิดร้านครบ ${PAUSE_MAX_PER_30D} ครั้งแล้ว ระบบแจ้งผู้ดูแลแล้ว หากจำเป็นโปรดติดต่อผู้ดูแล`,
      };
    }

    await new PauseShopUseCase(
      container.shopRepository,
      container.subscriptionRepository,
    ).execute(shopId);

    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.shopPaused,
      targetType: "shop",
      targetId: shopId,
      shopId,
      ip,
    });

    revalidatePath("/shop");
    revalidatePath("/shop/settings");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Owner reopens their shop (resumes billing; remaining whole days unchanged). */
export async function resumeMyShopAction(): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    const changed = await new ResumeShopUseCase(
      container.subscriptionRepository,
    ).execute(shopId);

    if (changed) {
      await container.auditLogger.record({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.shopResumed,
        targetType: "shop",
        targetId: shopId,
        shopId,
        ip: await getClientIp(),
      });
      revalidatePath("/shop");
      revalidatePath("/shop/settings");
    }
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function ownerShopId(): Promise<string> {
  const { shopId } = await requireShopWrite();
  await assertShopActive(shopId);
  return shopId;
}

/** Owner updates the shop display name + PromptPay target (order-payment QR). */
export async function updateSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const shopId = await ownerShopId();
    await new UpdateShopSettingsUseCase(container.shopRepository).execute(shopId, {
      name: String(formData.get("name") ?? ""),
      promptpayTarget: String(formData.get("promptpayTarget") ?? ""),
    });
    revalidatePath("/shop/settings");
    return { success: "บันทึกการตั้งค่าแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function createBranchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const shopId = await ownerShopId();
    await new CreateBranchUseCase(container.branchRepository).execute(
      shopId,
      String(formData.get("name") ?? ""),
    );
    revalidatePath("/shop/branches");
    return { success: "เพิ่มสาขาแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleBranchAction(
  branchId: string,
  isActive: boolean,
): Promise<void> {
  const shopId = await ownerShopId();
  const branch = await container.branchRepository.findById(branchId);
  if (!branch || branch.shopId !== shopId) throw new Error("ไม่พบสาขาในร้านนี้");
  await container.branchRepository.setActive(branchId, isActive);
  revalidatePath("/shop/branches");
}

export async function updateBranchLocationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const shopId = await ownerShopId();
    const branchId = String(formData.get("branchId") ?? "");
    const latRaw = String(formData.get("latitude") ?? "").trim();
    const lngRaw = String(formData.get("longitude") ?? "").trim();
    const parse = (v: string): number | null => {
      if (v === "") return null;
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error("พิกัดไม่ถูกต้อง");
      return n;
    };
    await new UpdateBranchLocationUseCase(container.branchRepository).execute(
      shopId,
      branchId,
      {
        latitude: parse(latRaw),
        longitude: parse(lngRaw),
        address: String(formData.get("address") ?? ""),
      },
    );
    revalidatePath("/shop/branches");
    return { success: "บันทึกตำแหน่งแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function createStaffAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await assertShopActive(shopId);
    const password = String(formData.get("password") ?? "");
    await assertPasswordAcceptable(password, container.passwordBreachChecker);
    const staff = await new CreateStaffUseCase(
      container.userRepository,
      container.branchRepository,
      container.passwordHasher,
    ).execute({
      shopId,
      branchId: String(formData.get("branchId") ?? ""),
      email: String(formData.get("email") ?? ""),
      password,
    });
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.staffCreated,
      targetType: "user",
      targetId: staff.id,
      shopId,
      ip: await getClientIp(),
      metadata: { email: staff.email },
    });
    revalidatePath("/shop/staff");
    return { success: "เพิ่มพนักงานแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleStaffAction(
  userId: string,
  isActive: boolean,
): Promise<void> {
  const shopId = await ownerShopId();
  const target = await container.userRepository.findById(userId);
  if (!target || target.shopId !== shopId || target.role !== "branch_staff") {
    throw new Error("ไม่พบพนักงานในร้านนี้");
  }
  await container.userRepository.setActive(userId, isActive);
  revalidatePath("/shop/staff");
}

/** Owner force-logs-out one of their staff from all devices (compromised account). */
export async function forceLogoutStaffAction(
  userId: string,
): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    const target = await container.userRepository.findById(userId);
    if (!target || target.shopId !== shopId || target.role !== "branch_staff") {
      throw new Error("ไม่พบพนักงานในร้านนี้");
    }
    await container.sessionRepository.deleteAllForUser(userId);
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.forceLogout,
      targetType: "user",
      targetId: userId,
      shopId,
      ip: await getClientIp(),
      metadata: { email: target.email },
    });
    revalidatePath("/shop/staff");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Next page of this shop's own audit trail (owner Security page "load more"). */
export async function loadMoreShopAuditAction(
  cursor: string,
): Promise<Page<AuditLog>> {
  const { shopId } = await requireShopWrite();
  return container.auditLogRepository.pageByShop(shopId, { cursor });
}

/** Owner sets a new password for one of their staff (e.g. they forgot it). */
export async function resetStaffPasswordAction(
  userId: string,
  newPassword: string,
): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    const target = await container.userRepository.findById(userId);
    if (!target || target.shopId !== shopId || target.role !== "branch_staff") {
      throw new Error("ไม่พบพนักงานในร้านนี้");
    }
    await new ResetPasswordUseCase(
      container.userRepository,
      container.passwordHasher,
      container.sessionRepository,
      container.passwordBreachChecker,
    ).execute(userId, newPassword);
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.passwordResetByAdmin,
      targetType: "user",
      targetId: userId,
      shopId,
      ip: await getClientIp(),
    });
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
