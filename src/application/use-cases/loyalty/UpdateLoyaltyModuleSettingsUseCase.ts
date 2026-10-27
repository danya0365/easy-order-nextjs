import type { Shop } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";

export interface UpdateLoyaltyModuleInput {
  loyaltyEnabled?: boolean;
  stampCardEnabled?: boolean;
  spendPointsEnabled?: boolean;
}

/**
 * Shop toggles for loyalty module + kinds. Requires loyaltyAllowedByAdmin.
 * Enabling stamp card with zero active types auto-creates a default type.
 */
export class UpdateLoyaltyModuleSettingsUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly stampTypes: ILoyaltyStampTypeRepository,
  ) {}

  async execute(shopId: string, input: UpdateLoyaltyModuleInput): Promise<Shop> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.loyaltyAllowedByAdmin) {
      throw new Error("แอดมินยังไม่อนุญาตให้ร้านนี้ใช้ระบบสะสมแต้ม/แสตมป์");
    }

    const patch: UpdateLoyaltyModuleInput = {};
    if (input.loyaltyEnabled !== undefined) {
      patch.loyaltyEnabled = input.loyaltyEnabled;
    }
    if (input.stampCardEnabled !== undefined) {
      patch.stampCardEnabled = input.stampCardEnabled;
    }
    if (input.spendPointsEnabled !== undefined) {
      patch.spendPointsEnabled = input.spendPointsEnabled;
    }

    const nextEnabled =
      patch.loyaltyEnabled !== undefined
        ? patch.loyaltyEnabled
        : shop.loyaltyEnabled;
    const nextStamp =
      patch.stampCardEnabled !== undefined
        ? patch.stampCardEnabled
        : shop.stampCardEnabled;

    if (nextEnabled && nextStamp) {
      const active = await this.stampTypes.countActive(shopId);
      if (active < 1) {
        await this.stampTypes.create({
          shopId,
          name: "แสตมป์ทั่วไป",
          threshold: 10,
          rewardText: "ของรางวัล",
          isActive: true,
          isDefault: true,
          sortOrder: 0,
        });
      }
    }

    return this.shops.updateSettings(shopId, patch);
  }
}
