import type { OrderWithItems } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";

export interface CustomerDataExport {
  exportedAt: string;
  shop: { id: string; name: string };
  customer: {
    id: string;
    phone: string;
    displayName: string | null;
    publicCode: string;
    createdAt: string;
  };
  orders: OrderWithItems[];
}

/**
 * PDPA data-access (export): aggregate everything a shop holds about ONE of its
 * customers into a portable object. Every read is scoped by `shopId`, so a shop
 * can only export its own customers (cross-tenant ids resolve to "not found").
 */
export class ExportCustomerDataUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly orders: IOrderRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    shopId: string,
    customerId: string,
  ): Promise<CustomerDataExport> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const customer = await this.customers.findById(shopId, customerId);
    if (!customer) throw new Error("ไม่พบลูกค้าในร้านนี้");

    // Walk every page of the customer's orders so the export is complete.
    const orders: OrderWithItems[] = [];
    let cursor: string | null = null;
    do {
      const page = await this.orders.pageByCustomer(shopId, customerId, {
        limit: 100,
        cursor,
      });
      orders.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    return {
      exportedAt: this.now().toISOString(),
      shop: { id: shop.id, name: shop.name },
      customer: {
        id: customer.id,
        phone: customer.phone,
        displayName: customer.displayName,
        publicCode: customer.publicCode,
        createdAt: customer.createdAt,
      },
      orders,
    };
  }
}
