"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { AnonymizeCustomerUseCase } from "@/src/application/use-cases/customer/AnonymizeCustomerUseCase";
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
    // Accountability: attribute the irreversible erasure to the real actor
    // (the admin themselves when impersonating, not the shop).
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
