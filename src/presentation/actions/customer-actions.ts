"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { AnonymizeCustomerUseCase } from "@/src/application/use-cases/customer/AnonymizeCustomerUseCase";
import { ApproveOnlineMemberUseCase } from "@/src/application/use-cases/member/ApproveOnlineMemberUseCase";
import { RejectOnlineMemberUseCase } from "@/src/application/use-cases/member/RejectOnlineMemberUseCase";
import {
  BlockMemberPhoneUseCase,
  RejectSuspiciousMembersUseCase,
  RotateStaticJoinTokenUseCase,
  SetMemberSignupPausedUseCase,
} from "@/src/application/use-cases/member/StaticJoinModerationUseCases";
import type { CreateAuditLogInput } from "@/src/application/repositories/IAuditLogRepository";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";

/**
 * PDPA erasure — anonymize one of the shop's customers (strip PII, drop device
 * bindings; order rows are kept but de-identified). Owner-only (destructive +
 * irreversible); admins impersonating the shop are allowed via requireShopWrite.
 */
export async function anonymizeCustomerAction(
  customerId: string,
): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new AnonymizeCustomerUseCase(
      container.customerRepository,
      container.customerDeviceRepository,
    ).execute(shopId, customerId);
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.customerErased,
      targetType: "customer",
      targetId: customerId,
      shopId,
      ip: await getClientIp(),
    });
    revalidatePath("/shop/customers");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function approveOnlineMemberAction(
  customerId: string,
): Promise<{ error?: string; message?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new ApproveOnlineMemberUseCase(container.customerRepository).execute(
      shopId,
      customerId,
      actor.id,
    );
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.customerOnlineApproved,
      targetType: "customer",
      targetId: customerId,
      shopId,
      ip: await getClientIp(),
    });
    revalidatePath("/shop/customers");
    return { message: "อนุมัติสมาชิกสำเร็จ" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function rejectOnlineMemberAction(
  customerId: string,
): Promise<{ error?: string; message?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new RejectOnlineMemberUseCase(container.customerRepository).execute(
      shopId,
      customerId,
      actor.id,
    );
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.customerOnlineRejected,
      targetType: "customer",
      targetId: customerId,
      shopId,
      ip: await getClientIp(),
    });
    revalidatePath("/shop/customers");
    return { message: "ปฏิเสธคำขอสมาชิกแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

type ActionResult = { error?: string; message?: string };

async function audit(
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
  actor: { id: string; role: CreateAuditLogInput["actorRole"] },
  shopId: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  await container.auditLogger.record({
    actorUserId: actor.id,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    shopId,
    ip: await getClientIp(),
    ...(metadata ? { metadata } : {}),
  });
}

/** Revoke the printed static QR and mint a new `k` (old QR stops working). */
export async function rotateStaticJoinTokenAction(): Promise<ActionResult> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new RotateStaticJoinTokenUseCase(container.shopRepository).execute(
      shopId,
    );
    await audit(AUDIT_ACTIONS.staticJoinTokenRotated, actor, shopId, "shop", shopId);
    revalidatePath("/shop/settings");
    revalidatePath("/shop/customers");
    return { message: "สร้าง QR ใหม่แล้ว — QR เดิมใช้ไม่ได้อีก" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Pause / resume new static-QR member signups. */
export async function setMemberSignupPausedAction(
  paused: boolean,
): Promise<ActionResult> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new SetMemberSignupPausedUseCase(container.shopRepository).execute(
      shopId,
      paused,
    );
    await audit(AUDIT_ACTIONS.memberSignupPausedSet, actor, shopId, "shop", shopId, {
      paused,
    });
    revalidatePath("/shop/settings");
    revalidatePath("/shop/customers");
    return {
      message: paused ? "หยุดรับสมาชิกใหม่ชั่วคราวแล้ว" : "เปิดรับสมาชิกใหม่แล้ว",
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Reject every pending request flagged suspicious. */
export async function rejectSuspiciousMembersAction(): Promise<ActionResult> {
  try {
    const { actor, shopId } = await requireShopWrite();
    const ids = await new RejectSuspiciousMembersUseCase(
      container.customerRepository,
      container.memberSignupGuardRepository,
    ).execute(shopId, actor.id);
    for (const id of ids) {
      await audit(
        AUDIT_ACTIONS.customerOnlineRejectedSuspicious,
        actor,
        shopId,
        "customer",
        id,
      );
    }
    revalidatePath("/shop/customers");
    return { message: `ปฏิเสธคำขอที่น่าสงสัย ${ids.length} รายการ` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Block this customer's phone at the shop (rejects if pending). */
export async function blockMemberPhoneAction(
  customerId: string,
): Promise<ActionResult> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new BlockMemberPhoneUseCase(
      container.customerRepository,
      container.memberSignupGuardRepository,
    ).execute(shopId, customerId, actor.id);
    await audit(AUDIT_ACTIONS.customerPhoneBlocked, actor, shopId, "customer", customerId);
    revalidatePath("/shop/customers");
    return { message: "บล็อกเบอร์นี้แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
