import type { OrderWithItems } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";

/**
 * Staff confirms they received payment (QR or cash) for an order. The shop is
 * physically present, so this is a manual confirmation — no gateway/slip.
 */
export class ConfirmOrderPaymentUseCase {
  constructor(private readonly orders: IOrderRepository) {}

  async execute(shopId: string, orderId: string): Promise<OrderWithItems> {
    const order = await this.orders.findById(shopId, orderId);
    if (!order) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    if (order.paymentStatus === "paid") return order;
    if (order.status === "cancelled") {
      throw new Error("ออเดอร์ถูกยกเลิกแล้ว");
    }
    return this.orders.markPaid(shopId, orderId);
  }
}
