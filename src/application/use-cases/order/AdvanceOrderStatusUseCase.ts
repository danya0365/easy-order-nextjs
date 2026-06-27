import type { OrderStatus, OrderWithItems } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";

/** Allowed forward transitions; any open order can also be cancelled. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Move an order along the queue (pending→preparing→ready→completed) or cancel it. */
export class AdvanceOrderStatusUseCase {
  constructor(private readonly orders: IOrderRepository) {}

  async execute(
    shopId: string,
    orderId: string,
    to: OrderStatus,
  ): Promise<OrderWithItems> {
    const order = await this.orders.findById(shopId, orderId);
    if (!order) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    if (!NEXT[order.status].includes(to)) {
      throw new Error("เปลี่ยนสถานะออเดอร์ไม่ได้");
    }
    return this.orders.setStatus(shopId, orderId, to);
  }
}
