import type { LoyaltyPointsReward } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ILoyaltyPointsRewardRepository } from "@/src/application/repositories/ILoyaltyPointsRewardRepository";

export class UpsertPointsRewardUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly rewards: ILoyaltyPointsRewardRepository,
  ) {}

  async create(
    shopId: string,
    input: { name: string; pointsCost: number; description?: string | null },
  ): Promise<LoyaltyPointsReward> {
    await this.requireAllowed(shopId);
    const name = input.name.trim();
    if (!name) throw new Error("กรุณาตั้งชื่อรางวัล");
    const cost = Math.floor(input.pointsCost);
    if (!Number.isFinite(cost) || cost < 1) {
      throw new Error("แต้มที่ใช้แลกต้องอย่างน้อย 1");
    }
    const existing = await this.rewards.listByShop(shopId);
    return this.rewards.create({
      shopId,
      name,
      pointsCost: cost,
      description: (input.description ?? "").trim() || null,
      isActive: true,
      sortOrder: existing.length,
    });
  }

  async update(
    shopId: string,
    rewardId: string,
    input: {
      name?: string;
      pointsCost?: number;
      description?: string | null;
    },
  ): Promise<LoyaltyPointsReward> {
    await this.requireAllowed(shopId);
    const reward = await this.rewards.findById(rewardId);
    if (!reward || reward.shopId !== shopId) {
      throw new Error("ไม่พบรางวัลในร้านนี้");
    }
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("กรุณาตั้งชื่อรางวัล");
    }
    if (input.pointsCost !== undefined) {
      const cost = Math.floor(input.pointsCost);
      if (!Number.isFinite(cost) || cost < 1) {
        throw new Error("แต้มที่ใช้แลกต้องอย่างน้อย 1");
      }
    }
    return this.rewards.update(rewardId, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.pointsCost !== undefined
        ? { pointsCost: Math.floor(input.pointsCost) }
        : {}),
      ...(input.description !== undefined
        ? { description: (input.description ?? "").trim() || null }
        : {}),
    });
  }

  async setActive(
    shopId: string,
    rewardId: string,
    isActive: boolean,
  ): Promise<LoyaltyPointsReward> {
    await this.requireAllowed(shopId);
    const reward = await this.rewards.findById(rewardId);
    if (!reward || reward.shopId !== shopId) {
      throw new Error("ไม่พบรางวัลในร้านนี้");
    }
    return this.rewards.setActive(rewardId, isActive);
  }

  private async requireAllowed(shopId: string) {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.loyaltyAllowedByAdmin) {
      throw new Error("แอดมินยังไม่อนุญาตให้ร้านนี้ใช้ระบบสะสมแต้ม");
    }
  }
}
