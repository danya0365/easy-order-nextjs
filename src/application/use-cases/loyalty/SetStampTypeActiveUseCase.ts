import type { LoyaltyStampType } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";

export class SetStampTypeActiveUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly stampTypes: ILoyaltyStampTypeRepository,
  ) {}

  async execute(
    shopId: string,
    typeId: string,
    isActive: boolean,
  ): Promise<LoyaltyStampType> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.loyaltyAllowedByAdmin) {
      throw new Error("ร้านนี้ยังไม่ได้รับอนุญาตให้ใช้ระบบสะสมแสตมป์");
    }

    const type = await this.stampTypes.findById(typeId);
    if (!type || type.shopId !== shopId) {
      throw new Error("ไม่พบประเภทแสตมป์ในร้านนี้");
    }
    if (!isActive) {
      const active = await this.stampTypes.countActive(shopId);
      if (active <= 1) {
        throw new Error("ต้องมีประเภทแสตมป์ที่เปิดใช้งานอย่างน้อย 1 ประเภท");
      }
    }
    return this.stampTypes.setActive(typeId, isActive);
  }
}
