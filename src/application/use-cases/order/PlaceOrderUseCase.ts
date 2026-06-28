import type { OrderPaymentMethod, OrderWithItems } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import { normalizePhone, isValidThaiPhone } from "@/src/domain/services/phone";

export interface CartLine {
  menuItemId: string;
  quantity: number;
}

export interface PlaceOrderInput {
  shopId: string;
  paymentMethod: OrderPaymentMethod;
  note?: string | null;
  /** Optional walk-in identity. A phone ties the order to a per-shop customer. */
  customerName?: string | null;
  customerPhone?: string | null;
  /** Operator (owner/staff) placing it from the counter UI; null for kiosk. */
  performedBy?: string | null;
  cart: CartLine[];
}

const MAX_NAME_LEN = 80;

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
    private readonly customers: ICustomerRepository,
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

    // Optional walk-in identity. A valid phone resolves (or creates) a per-shop
    // customer the order links to; the name/phone are also snapshotted on the
    // order. A name alone (no phone) is kept as a snapshot only.
    const customerName = input.customerName?.trim() || null;
    if (customerName && customerName.length > MAX_NAME_LEN) {
      throw new Error("ชื่อลูกค้ายาวเกินไป");
    }
    let customerId: string | null = null;
    let customerPhone: string | null = null;
    if (input.customerPhone?.trim()) {
      const phone = normalizePhone(input.customerPhone);
      if (!isValidThaiPhone(phone)) throw new Error("เบอร์โทรไม่ถูกต้อง");
      const customer = await this.customers.findOrCreate(
        input.shopId,
        phone,
        customerName,
      );
      customerId = customer.id;
      customerPhone = phone;
    }

    return this.orders.create({
      shopId: input.shopId,
      paymentMethod: input.paymentMethod,
      note,
      customerId,
      customerName,
      customerPhone,
      performedBy: input.performedBy ?? null,
      items: lines,
    });
  }
}
