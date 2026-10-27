import type { CustomerStampCardView } from "@/src/domain/entities";
import { normalizePhone } from "@/src/domain/services/phone";
import { isStampCardOn } from "@/src/domain/services/loyalty-gates";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ILoyaltyStampCardRepository } from "@/src/application/repositories/ILoyaltyStampCardRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";
import type { ILoyaltyStampBalanceRepository } from "@/src/application/repositories/ILoyaltyStampBalanceRepository";
import type { ILoyaltyStampTransactionRepository } from "@/src/application/repositories/ILoyaltyStampTransactionRepository";
import type { ILoyaltyStampRedemptionRepository } from "@/src/application/repositories/ILoyaltyStampRedemptionRepository";
import { loadStampCardView } from "./loadCardView";

export interface RedeemStampRewardInput {
  shopId: string;
  branchId?: string | null;
  phone: string;
  stampTypeId: string;
  performedBy: string;
}

export class RedeemStampRewardUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly customers: ICustomerRepository,
    private readonly cards: ILoyaltyStampCardRepository,
    private readonly stampTypes: ILoyaltyStampTypeRepository,
    private readonly balances: ILoyaltyStampBalanceRepository,
    private readonly transactions: ILoyaltyStampTransactionRepository,
    private readonly redemptions: ILoyaltyStampRedemptionRepository,
  ) {}

  async execute(input: RedeemStampRewardInput): Promise<CustomerStampCardView> {
    const phone = normalizePhone(input.phone);
    const shop = await this.shops.findById(input.shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!isStampCardOn(shop)) {
      throw new Error("ระบบแสตมป์ยังไม่เปิดใช้งานสำหรับร้านนี้");
    }

    const customer = await this.customers.findByPhone(input.shopId, phone);
    if (!customer) throw new Error("ไม่พบลูกค้า");

    const type = await this.stampTypes.findById(input.stampTypeId);
    if (!type || type.shopId !== input.shopId) {
      throw new Error("ไม่พบประเภทแสตมป์");
    }

    const card = await this.cards.findByCustomer(input.shopId, customer.id);
    if (!card) throw new Error("ลูกค้ายังไม่มีแสตมป์");

    const balance = await this.balances.findByCardAndType(card.id, type.id);
    const current = balance?.currentStamps ?? 0;
    if (!balance || current < type.threshold) {
      throw new Error(
        `แสตมป์ "${type.name}" ยังไม่ครบ (${current}/${type.threshold}) ยังแลกไม่ได้`,
      );
    }

    await this.redemptions.create({
      shopId: input.shopId,
      branchId: input.branchId ?? null,
      customerId: customer.id,
      cardId: card.id,
      stampTypeId: type.id,
      rewardTextSnapshot: type.rewardText,
      stampsSpent: type.threshold,
      performedBy: input.performedBy,
    });

    await this.balances.applyRedemption(balance.id, type.threshold);

    await this.transactions.create({
      shopId: input.shopId,
      branchId: input.branchId ?? null,
      customerId: customer.id,
      cardId: card.id,
      stampTypeId: type.id,
      type: "redeem_adjust",
      quantity: -type.threshold,
      performedBy: input.performedBy,
      note: `แลกรางวัล: ${type.name}`,
    });

    return loadStampCardView(
      {
        stampTypes: this.stampTypes,
        cards: this.cards,
        balances: this.balances,
      },
      input.shopId,
      customer,
    );
  }
}
