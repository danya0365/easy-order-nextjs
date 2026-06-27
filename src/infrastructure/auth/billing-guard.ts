import "server-only";

import { container } from "@/src/infrastructure/di/container";
import {
  GetBillingStateUseCase,
  type BillingState,
} from "@/src/application/use-cases/billing/GetBillingStateUseCase";

export function getBillingState(shopId: string): Promise<BillingState> {
  return new GetBillingStateUseCase(
    container.shopRepository,
    container.subscriptionRepository,
  ).execute(shopId);
}

/** Throw if the shop can't operate (suspended/overdue-past-grace, or paused). */
export async function assertShopActive(shopId: string): Promise<void> {
  const { status } = await getBillingState(shopId);
  if (status.isPaused) {
    throw new Error("ร้านปิดชั่วคราวอยู่ กรุณาเปิดร้านอีกครั้งก่อนใช้งาน");
  }
  if (status.isSuspended) {
    throw new Error("ร้านถูกระงับเนื่องจากค้างชำระ กรุณาชำระเงินก่อนใช้งาน");
  }
}
