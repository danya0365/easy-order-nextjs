import type { Customer, OrderWithItems, Shop } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { Page, PageOpts } from "@/src/application/repositories/pagination";

export interface CustomerOrderHistory {
  shop: Shop;
  customer: Customer;
  orders: Page<OrderWithItems>;
}

/**
 * Resolve a member device token (from the eo_member_<slug> cookie) into the
 * customer's own order history at that shop — the self-service "scan to see my
 * orders" view. Returns null when the token doesn't resolve to this shop.
 */
export class GetCustomerOrderHistoryUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly devices: ICustomerDeviceRepository,
    private readonly orders: IOrderRepository,
  ) {}

  async execute(
    slug: string,
    token: string | null,
    opts: PageOpts = {},
  ): Promise<CustomerOrderHistory | null> {
    const shop = await this.shops.findBySlug(slug);
    if (!shop) return null;
    if (!token) return null;

    const found = await this.devices.findByToken(token);
    // The token must belong to a customer of THIS shop.
    if (!found || found.customer.shopId !== shop.id) return null;

    const orders = await this.orders.pageByCustomer(
      shop.id,
      found.customer.id,
      opts,
    );
    return { shop, customer: found.customer, orders };
  }
}
