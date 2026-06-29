import type { OrderWithItems } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";

/**
 * Self-service settlement: the CUSTOMER taps "ชำระเงินแล้ว" on the kiosk after
 * self-paying (PromptPay/cash, no staff at the counter). Collapses the lifecycle
 * — mark the order paid AND completed in one step — since there is nobody to
 * advance the queue. Self-attested (no gateway/slip); the caller restricts this
 * to shops in self-service mode and to the kiosk's own shop.
 */
export class SelfServeCompleteOrderUseCase {
  constructor(private readonly orders: IOrderRepository) {}

  async execute(shopId: string, orderId: string): Promise<OrderWithItems> {
    const order = await this.orders.findById(shopId, orderId);
    if (!order) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    if (order.status === "cancelled") throw new Error("ออเดอร์ถูกยกเลิกแล้ว");
    if (order.paymentStatus !== "paid") {
      await this.orders.markPaid(shopId, orderId);
    }
    if (order.status !== "completed") {
      return this.orders.setStatus(shopId, orderId, "completed");
    }
    return this.orders.findById(shopId, orderId) as Promise<OrderWithItems>;
  }
}
