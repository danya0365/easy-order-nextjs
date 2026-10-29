"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { BulkCustomerUseCase } from "@/src/application/use-cases/customer/CustomerCrmUseCases";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";

export type CrmActionResult = { error?: string; done?: number; skipped?: number };

/** Bulk approve / block from the customers list (owner or impersonating admin). */
export async function bulkCustomerAction(
  op: "approve" | "block",
  ids: string[],
): Promise<CrmActionResult> {
  try {
    const { actor, shopId } = await requireShopWrite();
    if (op !== "approve" && op !== "block") throw new Error("invalid op");
    if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string")) throw new Error("invalid ids");
    const uc = new BulkCustomerUseCase(
      container.customerRepository,
      container.customerCrmRepository,
      container.memberSignupGuardRepository,
    );
    const r = op === "approve" ? await uc.approve(shopId, ids, actor.id) : await uc.block(shopId, ids, actor.id);
    const ip = await getClientIp();
    for (const id of r.done) {
      await container.auditLogger.record({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: op === "approve" ? AUDIT_ACTIONS.customerOnlineApproved : AUDIT_ACTIONS.customerBlocked,
        targetType: "customer",
        targetId: id,
        shopId,
        ip,
        metadata: { bulk: true },
      });
    }
    revalidatePath("/shop/customers");
    return { done: r.done.length, skipped: r.skipped.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
