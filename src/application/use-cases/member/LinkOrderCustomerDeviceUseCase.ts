import type { CustomerLinkMode } from "@/src/domain/entities";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";

export interface LinkOrderCustomerInput {
  shopId: string;
  mode: CustomerLinkMode;
  /** Customer the order was attached to (phone matched / created), if any. */
  customerId: string | null;
  /** Consent checkbox on the order sheet (only read in "confirm" mode). */
  consent: boolean;
  /** Member token already on this device for the shop, if any. */
  currentToken: string | null;
}

/**
 * After an online order: remember this device for the customer the order was
 * linked to (PlaceOrderUseCase already matched-by-phone or created them), so
 * the next visit prefills and the orders/loyalty tabs work. Mode:
 *  - auto    → always link
 *  - confirm → link only with explicit consent
 *  - off     → never (legacy: bind via the post-order history QR)
 * Returns a NEW token to set as the member cookie, or null (nothing to do).
 */
export class LinkOrderCustomerDeviceUseCase {
  constructor(private readonly devices: ICustomerDeviceRepository) {}

  async execute(input: LinkOrderCustomerInput): Promise<{ token: string } | null> {
    if (!input.customerId) return null;
    if (input.mode === "off") return null;
    if (input.mode === "confirm" && !input.consent) return null;
    if (input.currentToken) {
      const bound = await this.devices.findByToken(input.currentToken);
      if (bound && bound.customer.id === input.customerId && bound.customer.shopId === input.shopId) {
        return null; // already remembered for this customer
      }
    }
    return this.devices.create(input.customerId);
  }
}
