import "server-only";

import { container } from "@/src/infrastructure/di/container";
import { LuckyWheelService } from "@/src/application/use-cases/wheel/LuckyWheelUseCases";
import type { Order } from "@/src/domain/entities";

/** Lucky wheel service wired to the app container. */
export function wheelService(): LuckyWheelService {
  return new LuckyWheelService({
    wheel: container.luckyWheelRepository,
    shops: container.shopRepository,
    platform: container.platformSettingsRepository,
    balances: container.loyaltyPointsBalanceRepository,
    pointsTx: container.loyaltyPointsTransactionRepository,
    orders: container.orderRepository,
  });
}

/** After an order is paid/completed: grant spin tickets (never blocks the caller). */
export async function grantWheelTicketsSafe(order: Order | null | undefined): Promise<void> {
  if (!order) return;
  try {
    await wheelService().grantForOrder(order);
  } catch (e) {
    console.error("[wheel] grant failed", (e as Error).message);
  }
}

/** After an order is cancelled: revoke its unused tickets (never blocks the caller). */
export async function revokeWheelTicketsSafe(order: Pick<Order, "id" | "shopId">): Promise<void> {
  try {
    await wheelService().revokeForOrder(order);
  } catch (e) {
    console.error("[wheel] revoke failed", (e as Error).message);
  }
}

/** The member (customer) this device is remembered for at `shopId`, or null. */
export async function currentWheelMember(slug: string, shopId: string) {
  const { getMemberToken } = await import("@/src/infrastructure/auth/member");
  const token = await getMemberToken(slug);
  if (!token) return null;
  const bound = await container.customerDeviceRepository.findByToken(token);
  const c = bound?.customer;
  if (!c || c.shopId !== shopId || c.blockedAt) return null;
  return c;
}
