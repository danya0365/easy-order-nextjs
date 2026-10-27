import type { LoyaltyPointsSettings } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ILoyaltyPointsSettingsRepository } from "@/src/application/repositories/ILoyaltyPointsSettingsRepository";

export class UpdatePointsSettingsUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly settings: ILoyaltyPointsSettingsRepository,
  ) {}

  async execute(
    shopId: string,
    input: { satangPerPoint?: number; minRedeemPoints?: number | null },
  ): Promise<LoyaltyPointsSettings> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.loyaltyAllowedByAdmin) {
      throw new Error("แอดมินยังไม่อนุญาตให้ร้านนี้ใช้ระบบสะสมแต้ม");
    }

    const patch: {
      satangPerPoint?: number;
      minRedeemPoints?: number | null;
    } = {};

    if (input.satangPerPoint !== undefined) {
      const v = Math.floor(input.satangPerPoint);
      if (!Number.isFinite(v) || v < 1) {
        throw new Error("อัตราแต้มต้องเป็นจำนวนเต็มอย่างน้อย 1 สตางค์ต่อ 1 แต้ม");
      }
      patch.satangPerPoint = v;
    }
    if (input.minRedeemPoints !== undefined) {
      if (input.minRedeemPoints === null) {
        patch.minRedeemPoints = null;
      } else {
        const m = Math.floor(input.minRedeemPoints);
        if (!Number.isFinite(m) || m < 0) {
          throw new Error("แต้มขั้นต่ำในการแลกต้องไม่ติดลบ");
        }
        patch.minRedeemPoints = m;
      }
    }

    return this.settings.update(shopId, patch);
  }
}
