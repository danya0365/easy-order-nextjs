import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyPointsSettings } from "@/src/domain/entities";
import type {
  ILoyaltyPointsSettingsRepository,
  UpdateLoyaltyPointsSettingsInput,
} from "@/src/application/repositories/ILoyaltyPointsSettingsRepository";

type Row = typeof schema.loyaltyPointsSettings.$inferSelect;

function toSettings(r: Row): LoyaltyPointsSettings {
  return {
    id: r.id,
    shopId: r.shopId,
    satangPerPoint: r.satangPerPoint,
    minRedeemPoints: r.minRedeemPoints,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleLoyaltyPointsSettingsRepository
  implements ILoyaltyPointsSettingsRepository
{
  async getOrCreate(shopId: string): Promise<LoyaltyPointsSettings> {
    const existing = await db.query.loyaltyPointsSettings.findFirst({
      where: eq(schema.loyaltyPointsSettings.shopId, shopId),
    });
    if (existing) return toSettings(existing);
    const [r] = await db
      .insert(schema.loyaltyPointsSettings)
      .values({ shopId })
      .returning();
    return toSettings(r);
  }

  async update(
    shopId: string,
    input: UpdateLoyaltyPointsSettingsInput,
  ): Promise<LoyaltyPointsSettings> {
    await this.getOrCreate(shopId);
    const [r] = await db
      .update(schema.loyaltyPointsSettings)
      .set({
        ...(input.satangPerPoint !== undefined
          ? { satangPerPoint: input.satangPerPoint }
          : {}),
        ...(input.minRedeemPoints !== undefined
          ? { minRedeemPoints: input.minRedeemPoints }
          : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.loyaltyPointsSettings.shopId, shopId))
      .returning();
    return toSettings(r);
  }
}
