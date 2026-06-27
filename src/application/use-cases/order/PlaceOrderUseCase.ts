import type { OrderPaymentMethod, OrderWithItems } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";

export interface CartLine {
  menuItemId: string;
  quantity: number;
}

export interface PlaceOrderInput {
  shopId: string;
  paymentMethod: OrderPaymentMethod;
  note?: string | null;
  cart: CartLine[];
}

const MAX_QTY_PER_LINE = 99;
const MAX_LINES = 50;

/**
 * Place a customer order. Prices and names are read from the shop's own menu
 * (NEVER from the client) so a tampered kiosk payload can't change the total.
 * Each item must belong to the shop and be currently available.
 */
export class PlaceOrderUseCase {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly items: IMenuItemRepository,
  ) {}

  async execute(input: PlaceOrderInput): Promise<OrderWithItems> {
    const cart = input.cart.filter((l) => l.quantity > 0);
    if (cart.length === 0) throw new Error("ยังไม่ได้เลือกเมนู");
    if (cart.length > MAX_LINES) throw new Error("รายการในออเดอร์มากเกินไป");

    const lines = [];
    for (const line of cart) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new Error("จำนวนไม่ถูกต้อง");
      }
      if (line.quantity > MAX_QTY_PER_LINE) {
        throw new Error(`สั่งได้สูงสุด ${MAX_QTY_PER_LINE} ต่อรายการ`);
      }
      const item = await this.items.findById(line.menuItemId);
      if (!item || item.shopId !== input.shopId) {
        throw new Error("ไม่พบเมนูที่เลือกในร้านนี้");
      }
      if (!item.isAvailable) {
        throw new Error(`"${item.name}" หมดชั่วคราว กรุณาเลือกใหม่`);
      }
      lines.push({
        menuItemId: item.id,
        nameSnapshot: item.name,
        unitPriceSatang: item.priceSatang,
        quantity: line.quantity,
      });
    }

    const note = input.note?.trim() || null;
    if (note && note.length > 200) throw new Error("หมายเหตุยาวเกินไป");

    return this.orders.create({
      shopId: input.shopId,
      paymentMethod: input.paymentMethod,
      note,
      items: lines,
    });
  }
}
