import type { LoyaltyStampType } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";

export interface UpdateStampTypeFields {
  name?: string;
  threshold?: number;
  rewardText?: string;
  priceSatang?: number | null;
}

export class UpdateStampTypeUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly stampTypes: ILoyaltyStampTypeRepository,
  ) {}

  async execute(
    shopId: string,
    typeId: string,
    fields: UpdateStampTypeFields,
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
    if (fields.name !== undefined && !fields.name.trim()) {
      throw new Error("กรุณาตั้งชื่อประเภทแสตมป์");
    }
    if (fields.threshold !== undefined) {
      const t = Math.floor(fields.threshold);
      if (!Number.isFinite(t) || t < 1 || t > 100) {
        throw new Error("จำนวนสะสมต้องอยู่ระหว่าง 1–100");
      }
    }
    return this.stampTypes.update(typeId, {
      ...(fields.name !== undefined ? { name: fields.name.trim() } : {}),
      ...(fields.threshold !== undefined
        ? { threshold: Math.floor(fields.threshold) }
        : {}),
      ...(fields.rewardText !== undefined
        ? { rewardText: fields.rewardText.trim() }
        : {}),
      ...(fields.priceSatang !== undefined
        ? { priceSatang: fields.priceSatang }
        : {}),
    });
  }
}
