import type { LoyaltyPointsBalance } from "@/src/domain/entities";
import { normalizePhone, isValidThaiPhone } from "@/src/domain/services/phone";
import { isSpendPointsOn } from "@/src/domain/services/loyalty-gates";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ILoyaltyPointsBalanceRepository } from "@/src/application/repositories/ILoyaltyPointsBalanceRepository";
import type { ILoyaltyPointsTransactionRepository } from "@/src/application/repositories/ILoyaltyPointsTransactionRepository";

export interface AddPointsInput {
  shopId: string;
  phone: string;
  quantity: number;
  performedBy: string;
  displayName?: string | null;
  note?: string | null;
}

const MAX_PER_TX = 10_000;

export class AddPointsUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly balances: ILoyaltyPointsBalanceRepository,
    private readonly transactions: ILoyaltyPointsTransactionRepository,
  ) {}

  async execute(input: AddPointsInput): Promise<LoyaltyPointsBalance> {
    const quantity = Math.floor(input.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_PER_TX) {
      throw new Error(`จำนวนแต้มต้องอยู่ระหว่าง 1–${MAX_PER_TX}`);
    }
    const phone = normalizePhone(input.phone);
    if (!isValidThaiPhone(phone)) throw new Error("เบอร์โทรไม่ถูกต้อง");

    const shop = await this.shops.findById(input.shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!isSpendPointsOn(shop)) {
      throw new Error("ระบบแต้มยังไม่เปิดใช้งานสำหรับร้านนี้");
    }

    const customer = await this.customers.findOrCreate(
      input.shopId,
      phone,
      input.displayName,
    );
    const balance = await this.balances.findOrCreate(
      input.shopId,
      customer.id,
    );
    const updated = await this.balances.addPoints(balance.id, quantity);
    await this.transactions.create({
      shopId: input.shopId,
      customerId: customer.id,
      type: "earn",
      quantity,
      performedBy: input.performedBy,
      note: input.note ?? null,
    });
    return updated;
  }
}
