import { normalizePhone } from "@/src/domain/services/phone";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { IBindCodeRepository } from "@/src/application/repositories/IBindCodeRepository";

const TTL_MS = 5 * 60 * 1000; // 5 minutes
// Throttle: at most RATE_MAX bind codes per customer within RATE_WINDOW_MS,
// so a kiosk can't spam bind QRs.
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_MAX = 5;

/** Create a one-time bind code for an existing customer (by phone) in a shop. */
export class GenerateBindCodeUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly bindCodes: IBindCodeRepository,
  ) {}

  async execute(shopId: string, phone: string): Promise<{ code: string }> {
    const customer = await this.customers.findByPhone(
      shopId,
      normalizePhone(phone),
    );
    if (!customer) throw new Error("ไม่พบลูกค้า (สั่งโดยใส่เบอร์ก่อน)");

    const recent = await this.bindCodes.countRecentByCustomer(
      customer.id,
      new Date(Date.now() - RATE_WINDOW_MS),
    );
    if (recent >= RATE_MAX) {
      throw new Error("ออก QR ดูประวัติบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
    }

    return this.bindCodes.create({
      shopId,
      customerId: customer.id,
      expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
    });
  }
}
