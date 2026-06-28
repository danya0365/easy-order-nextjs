import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ICustomerDeviceRepository } from "@/src/application/repositories/ICustomerDeviceRepository";

/**
 * PDPA erasure (by anonymization): strip a customer's personal data (phone,
 * name, public QR code) and drop their device bindings, while KEEPING the order
 * rows (which only reference the now-anonymous customer) so the shop's order
 * history/aggregates stay consistent. Irreversible. Scoped by `shopId` — a shop
 * can only erase its own customers.
 */
export class AnonymizeCustomerUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly devices: ICustomerDeviceRepository,
  ) {}

  async execute(shopId: string, customerId: string): Promise<void> {
    const customer = await this.customers.findById(shopId, customerId);
    if (!customer) throw new Error("ไม่พบลูกค้าในร้านนี้");

    await this.customers.anonymize(customerId);
    await this.devices.deleteByCustomer(customerId);
  }
}
