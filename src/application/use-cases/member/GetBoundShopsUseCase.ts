import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";

export interface BoundShop {
  shopName: string;
  slug: string;
  /** When this device was bound (for "last visited"-style ordering, optional). */
  customerId: string;
}

/** Resolve every device token on this device into its shop (deduped by shop). */
export class GetBoundShopsUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly devices: ICustomerDeviceRepository,
  ) {}

  async execute(tokens: string[]): Promise<BoundShop[]> {
    const out: BoundShop[] = [];
    const seenShops = new Set<string>();

    for (const token of tokens) {
      const found = await this.devices.findByToken(token);
      if (!found) continue;
      const { customer } = found;
      if (seenShops.has(customer.shopId)) continue;

      const shop = await this.shops.findById(customer.shopId);
      if (!shop) continue;
      seenShops.add(customer.shopId);
      out.push({ shopName: shop.name, slug: shop.slug, customerId: customer.id });
    }
    return out;
  }
}
