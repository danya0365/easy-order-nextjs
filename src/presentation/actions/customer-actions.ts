"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { AnonymizeCustomerUseCase } from "@/src/application/use-cases/customer/AnonymizeCustomerUseCase";
import { ApproveOnlineMemberUseCase } from "@/src/application/use-cases/member/ApproveOnlineMemberUseCase";
import { RejectOnlineMemberUseCase } from "@/src/application/use-cases/member/RejectOnlineMemberUseCase";
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
