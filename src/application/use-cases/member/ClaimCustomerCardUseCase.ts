import type { Customer } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";

export type CustomerCardLookup =
  | { ok: true; shopId: string; customer: Customer }
  | { ok: false; reason: "not_found" | "blocked" };

/**
 * Customer-card claim (staff shows/prints the customer's QR → the customer
 * scans it with their phone camera → one confirm tap links THIS device to
 * that customer record via the member cookie). The caller must have already
 * verified the link's HMAC signature; this only resolves + binds within the
 * shop (shop-scoped lookup — a code from shop A never resolves in shop B).
 */
export class ClaimCustomerCardUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly devices: ICustomerDeviceRepository,
  ) {}

  async lookup(slug: string, code: string): Promise<CustomerCardLookup> {
    const shop = await this.shops.findBySlug(slug);
    if (!shop) return { ok: false, reason: "not_found" };
    const customer = await this.customers.findByPublicCode(shop.id, code.trim());
    if (!customer || customer.publicCode.startsWith("erased:")) {
      return { ok: false, reason: "not_found" };
    }
    if (customer.blockedAt) return { ok: false, reason: "blocked" };
    return { ok: true, shopId: shop.id, customer };
  }

  /** Bind a new device token to the customer. Null when the card is invalid. */
  async claim(slug: string, code: string): Promise<{ token: string; customerId: string } | null> {
    const found = await this.lookup(slug, code);
    if (!found.ok) return null;
    const { token } = await this.devices.create(found.customer.id);
    return { token, customerId: found.customer.id };
  }
}
