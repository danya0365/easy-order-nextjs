import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyPointsReward } from "@/src/domain/entities";
import type {
  CreateLoyaltyPointsRewardInput,
  ILoyaltyPointsRewardRepository,
  UpdateLoyaltyPointsRewardInput,
} from "@/src/application/repositories/ILoyaltyPointsRewardRepository";

type Row = typeof schema.loyaltyPointsRewards.$inferSelect;

function toReward(r: Row): LoyaltyPointsReward {
  return {
    id: r.id,
    shopId: r.shopId,
    name: r.name,
    pointsCost: r.pointsCost,
    description: r.description,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleLoyaltyPointsRewardRepository
  implements ILoyaltyPointsRewardRepository
{
  async create(
    input: CreateLoyaltyPointsRewardInput,
  ): Promise<LoyaltyPointsReward> {
    const [r] = await db
      .insert(schema.loyaltyPointsRewards)
      .values({
        shopId: input.shopId,
        name: input.name,
        pointsCost: input.pointsCost,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return toReward(r);
  }

  async findById(id: string): Promise<LoyaltyPointsReward | null> {
    const r = await db.query.loyaltyPointsRewards.findFirst({
      where: eq(schema.loyaltyPointsRewards.id, id),
    });
    return r ? toReward(r) : null;
  }

  async listByShop(
    shopId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<LoyaltyPointsReward[]> {
    const where = opts?.activeOnly
      ? and(
          eq(schema.loyaltyPointsRewards.shopId, shopId),
          eq(schema.loyaltyPointsRewards.isActive, true),
        )
      : eq(schema.loyaltyPointsRewards.shopId, shopId);
    const rows = await db.query.loyaltyPointsRewards.findMany({
      where,
      orderBy: [
        asc(schema.loyaltyPointsRewards.sortOrder),
        asc(schema.loyaltyPointsRewards.createdAt),
      ],
    });
    return rows.map(toReward);
  }

  async update(
    id: string,
    input: UpdateLoyaltyPointsRewardInput,
  ): Promise<LoyaltyPointsReward> {
    const [r] = await db
      .update(schema.loyaltyPointsRewards)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.pointsCost !== undefined
          ? { pointsCost: input.pointsCost }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.loyaltyPointsRewards.id, id))
      .returning();
    return toReward(r);
  }

  async setActive(id: string, isActive: boolean): Promise<LoyaltyPointsReward> {
    const [r] = await db
      .update(schema.loyaltyPointsRewards)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(schema.loyaltyPointsRewards.id, id))
      .returning();
    return toReward(r);
  }
}
