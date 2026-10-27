import type { LoyaltyPointsBalance } from "@/src/domain/entities";
import { normalizePhone } from "@/src/domain/services/phone";
import { isSpendPointsOn } from "@/src/domain/services/loyalty-gates";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ILoyaltyPointsSettingsRepository } from "@/src/application/repositories/ILoyaltyPointsSettingsRepository";
import type { ILoyaltyPointsBalanceRepository } from "@/src/application/repositories/ILoyaltyPointsBalanceRepository";
import type { ILoyaltyPointsTransactionRepository } from "@/src/application/repositories/ILoyaltyPointsTransactionRepository";
import type { ILoyaltyPointsRewardRepository } from "@/src/application/repositories/ILoyaltyPointsRewardRepository";

export interface RedeemPointsRewardInput {
  shopId: string;
  phone: string;
  rewardId: string;
  performedBy: string;
}

export class RedeemPointsRewardUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly settings: ILoyaltyPointsSettingsRepository,
    private readonly balances: ILoyaltyPointsBalanceRepository,
    private readonly transactions: ILoyaltyPointsTransactionRepository,
    private readonly rewards: ILoyaltyPointsRewardRepository,
  ) {}

  async execute(input: RedeemPointsRewardInput): Promise<LoyaltyPointsBalance> {
    const phone = normalizePhone(input.phone);
    const shop = await this.shops.findById(input.shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!isSpendPointsOn(shop)) {
      throw new Error("ระบบแต้มยังไม่เปิดใช้งานสำหรับร้านนี้");
    }

    const customer = await this.customers.findByPhone(input.shopId, phone);
    if (!customer) throw new Error("ไม่พบลูกค้า");

    const reward = await this.rewards.findById(input.rewardId);
    if (!reward || reward.shopId !== input.shopId || !reward.isActive) {
      throw new Error("ไม่พบรางวัล หรือถูกปิดใช้งาน");
    }

    const settings = await this.settings.getOrCreate(input.shopId);
    const balance = await this.balances.findOrCreate(
      input.shopId,
      customer.id,
    );

    if (
      settings.minRedeemPoints != null &&
      balance.currentPoints < settings.minRedeemPoints
    ) {
      throw new Error(
        `ต้องมีแต้มอย่างน้อย ${settings.minRedeemPoints} แต้มก่อนแลก`,
      );
    }
    if (balance.currentPoints < reward.pointsCost) {
      throw new Error(
        `แต้มไม่พอ (มี ${balance.currentPoints} ต้องการ ${reward.pointsCost})`,
      );
    }

    const updated = await this.balances.applyRedeem(
      balance.id,
      reward.pointsCost,
    );
    await this.transactions.create({
      shopId: input.shopId,
      customerId: customer.id,
      type: "redeem",
      quantity: -reward.pointsCost,
      performedBy: input.performedBy,
      rewardId: reward.id,
      note: `แลกรางวัล: ${reward.name}`,
    });
    return updated;
  }
}
