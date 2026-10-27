import type { OrderWithItems } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { EarnPointsFromOrderUseCase } from "@/src/application/use-cases/loyalty/EarnPointsFromOrderUseCase";

/**
 * Staff confirms they received payment (QR or cash) for an order. The shop is
 * physically present, so this is a manual confirmation — no gateway/slip.
 * When spend-points loyalty is on, awards points after marking paid (soft-fail).
 */
export class ConfirmOrderPaymentUseCase {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly earnPoints?: EarnPointsFromOrderUseCase,
  ) {}

  async execute(shopId: string, orderId: string): Promise<OrderWithItems> {
    const order = await this.orders.findById(shopId, orderId);
    if (!order) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    if (order.paymentStatus === "paid") {
      await this.tryEarn(order);
      return order;
    }
    if (order.status === "cancelled") {
      throw new Error("ออเดอร์ถูกยกเลิกแล้ว");
    }
    const paid = await this.orders.markPaid(shopId, orderId);
    await this.tryEarn(paid);
    return paid;
  }

  private async tryEarn(order: OrderWithItems): Promise<void> {
    if (!this.earnPoints) return;
    try {
      await this.earnPoints.execute(order);
    } catch {
      // Loyalty must never block payment confirmation.
    }
  }
}
