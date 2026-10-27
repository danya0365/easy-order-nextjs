import type { LoyaltyStampType, Shop } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ILoyaltyStampTypeRepository } from "@/src/application/repositories/ILoyaltyStampTypeRepository";

export interface CreateStampTypeInput {
  shopId: string;
  name: string;
  threshold: number;
  rewardText: string;
  priceSatang?: number | null;
}

const MAX_TYPES_PER_SHOP = 20;

/** Manage stamp types when admin has allowed loyalty (setup before enabling kind). */
export class CreateStampTypeUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly stampTypes: ILoyaltyStampTypeRepository,
  ) {}

  async execute(input: CreateStampTypeInput): Promise<LoyaltyStampType> {
    const shop = await this.requireShop(input.shopId);
    if (!shop.loyaltyAllowedByAdmin) {
      throw new Error("ร้านนี้ยังไม่ได้รับอนุญาตให้ใช้ระบบสะสมแสตมป์");
    }

    const name = input.name.trim();
    if (!name) throw new Error("กรุณาตั้งชื่อประเภทแสตมป์");
    const threshold = Math.floor(input.threshold);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
      throw new Error("จำนวนสะสมต้องอยู่ระหว่าง 1–100");
    }

    const existing = await this.stampTypes.listByShop(input.shopId);
    if (existing.length >= MAX_TYPES_PER_SHOP) {
      throw new Error(`มีประเภทแสตมป์ได้สูงสุด ${MAX_TYPES_PER_SHOP} ประเภท`);
    }

    return this.stampTypes.create({
      shopId: input.shopId,
      name,
      threshold,
      rewardText: input.rewardText.trim(),
      priceSatang: input.priceSatang ?? null,
      isActive: true,
      isDefault: existing.length === 0,
      sortOrder: existing.length,
    });
  }

  private async requireShop(shopId: string): Promise<Shop> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    return shop;
  }
}
