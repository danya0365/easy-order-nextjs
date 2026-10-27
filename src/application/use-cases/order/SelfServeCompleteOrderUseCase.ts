import type { OrderWithItems } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { EarnPointsFromOrderUseCase } from "@/src/application/use-cases/loyalty/EarnPointsFromOrderUseCase";

/**
 * Self-service settlement: the CUSTOMER taps "ชำระเงินแล้ว" on the kiosk after
 * self-paying. Collapses lifecycle — mark paid AND completed. Soft-awards
 * spend-points when loyalty is on.
 */
export class SelfServeCompleteOrderUseCase {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly earnPoints?: EarnPointsFromOrderUseCase,
  ) {}

  async execute(shopId: string, orderId: string): Promise<OrderWithItems> {
    const order = await this.orders.findById(shopId, orderId);
    if (!order) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    if (order.status === "cancelled") throw new Error("ออเดอร์ถูกยกเลิกแล้ว");
    let current = order;
    if (order.paymentStatus !== "paid") {
      current = await this.orders.markPaid(shopId, orderId);
      await this.tryEarn(current);
    } else {
      await this.tryEarn(current);
    }
    if (current.status !== "completed") {
      return this.orders.setStatus(shopId, orderId, "completed");
    }
    return this.orders.findById(shopId, orderId) as Promise<OrderWithItems>;
  }

  private async tryEarn(order: OrderWithItems): Promise<void> {
    if (!this.earnPoints) return;
    try {
      await this.earnPoints.execute(order);
    } catch {
      // Loyalty must never block settlement.
    }
  }
}
