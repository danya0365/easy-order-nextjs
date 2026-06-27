import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IBindCodeRepository } from "@/src/application/repositories/IBindCodeRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";

export interface ClaimResult {
  token: string;
}

/** Exchange a valid bind code (scanned at the kiosk) for a device token. */
export class ClaimBindCodeUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly bindCodes: IBindCodeRepository,
    private readonly devices: ICustomerDeviceRepository,
  ) {}

  async execute(
    slug: string,
    code: string,
    now: Date = new Date(),
  ): Promise<ClaimResult | null> {
    const shop = await this.shops.findBySlug(slug);
    if (!shop) return null;

    const bind = await this.bindCodes.findValid(code.trim(), now);
    if (!bind || bind.shopId !== shop.id) return null;

    const { token } = await this.devices.create(bind.customerId);
    await this.bindCodes.markUsed(code.trim(), now.toISOString());
    return { token };
  }
}
