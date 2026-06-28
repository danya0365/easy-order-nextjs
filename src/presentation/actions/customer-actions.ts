"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { AnonymizeCustomerUseCase } from "@/src/application/use-cases/customer/AnonymizeCustomerUseCase";

/**
 * PDPA erasure — anonymize one of the shop's customers (strip PII, drop device
 * bindings; order rows are kept but de-identified). Owner-only (destructive +
 * irreversible); admins impersonating the shop are allowed via requireShopWrite.
 */
export async function anonymizeCustomerAction(
  customerId: string,
): Promise<{ error?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    await new AnonymizeCustomerUseCase(
      container.customerRepository,
      container.customerDeviceRepository,
    ).execute(shopId, customerId);
    revalidatePath("/shop/customers");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
