import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";

/**
 * "ไม่ใช่ฉัน / ออกจากระบบสมาชิก": unbind THIS device from the member. Only the
 * device row behind the cookie token is removed, and only when it belongs to a
 * customer of this shop. The customer record, orders and points are untouched.
 */
export class UnlinkMemberDeviceUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly devices: ICustomerDeviceRepository,
  ) {}

  async execute(slug: string, token: string | null): Promise<boolean> {
    if (!token) return false;
    const shop = await this.shops.findBySlug(slug);
    if (!shop) return false;
    const found = await this.devices.findByToken(token);
    if (!found || found.customer.shopId !== shop.id) return false;
    await this.devices.deleteByToken(token);
    return true;
  }
}
