import type { Shop } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";

export interface UpdatePromotionsModuleInput {
  promotionsEnabled?: boolean;
}

/**
 * Shop toggle for the promotions module. Requires promotionsAllowedByAdmin
 * (mirror of UpdateLoyaltyModuleSettingsUseCase).
 */
export class UpdatePromotionsModuleSettingsUseCase {
  constructor(private readonly shops: IShopRepository) {}

  async execute(
    shopId: string,
    input: UpdatePromotionsModuleInput,
  ): Promise<Shop> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.promotionsAllowedByAdmin) {
      throw new Error("แอดมินยังไม่อนุญาตให้ร้านนี้ใช้โมดูลโปรโมชัน");
    }

    const patch: UpdatePromotionsModuleInput = {};
    if (input.promotionsEnabled !== undefined) {
      patch.promotionsEnabled = input.promotionsEnabled;
    }
    return this.shops.updateSettings(shopId, patch);
  }
}
