import "server-only";

import { and, asc, count, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyStampType } from "@/src/domain/entities";
import type {
  CreateLoyaltyStampTypeInput,
  ILoyaltyStampTypeRepository,
  UpdateLoyaltyStampTypeInput,
} from "@/src/application/repositories/ILoyaltyStampTypeRepository";

type Row = typeof schema.loyaltyStampTypes.$inferSelect;

function toType(r: Row): LoyaltyStampType {
  return {
    id: r.id,
    shopId: r.shopId,
    name: r.name,
    threshold: r.threshold,
    rewardText: r.rewardText,
    priceSatang: r.priceSatang,
    isActive: r.isActive,
    isDefault: r.isDefault,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleLoyaltyStampTypeRepository
  implements ILoyaltyStampTypeRepository
{
  async create(input: CreateLoyaltyStampTypeInput): Promise<LoyaltyStampType> {
    const [r] = await db
      .insert(schema.loyaltyStampTypes)
      .values({
        shopId: input.shopId,
        name: input.name,
        threshold: input.threshold,
        rewardText: input.rewardText,
        priceSatang: input.priceSatang ?? null,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return toType(r);
  }

  async findById(id: string): Promise<LoyaltyStampType | null> {
    const r = await db.query.loyaltyStampTypes.findFirst({
      where: eq(schema.loyaltyStampTypes.id, id),
    });
    return r ? toType(r) : null;
  }

  async listByShop(
    shopId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<LoyaltyStampType[]> {
    const where = opts?.activeOnly
      ? and(
          eq(schema.loyaltyStampTypes.shopId, shopId),
          eq(schema.loyaltyStampTypes.isActive, true),
        )
      : eq(schema.loyaltyStampTypes.shopId, shopId);
    const rows = await db.query.loyaltyStampTypes.findMany({
      where,
      orderBy: [
        asc(schema.loyaltyStampTypes.sortOrder),
        asc(schema.loyaltyStampTypes.createdAt),
      ],
    });
    return rows.map(toType);
  }

  async countActive(shopId: string): Promise<number> {
    const [r] = await db
      .select({ value: count() })
      .from(schema.loyaltyStampTypes)
      .where(
        and(
          eq(schema.loyaltyStampTypes.shopId, shopId),
          eq(schema.loyaltyStampTypes.isActive, true),
        ),
      );
    return r?.value ?? 0;
  }

  async update(
    id: string,
    input: UpdateLoyaltyStampTypeInput,
  ): Promise<LoyaltyStampType> {
    const [r] = await db
      .update(schema.loyaltyStampTypes)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.threshold !== undefined ? { threshold: input.threshold } : {}),
        ...(input.rewardText !== undefined
          ? { rewardText: input.rewardText }
          : {}),
        ...(input.priceSatang !== undefined
          ? { priceSatang: input.priceSatang }
          : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.loyaltyStampTypes.id, id))
      .returning();
    return toType(r);
  }

  async setActive(id: string, isActive: boolean): Promise<LoyaltyStampType> {
    const [r] = await db
      .update(schema.loyaltyStampTypes)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(schema.loyaltyStampTypes.id, id))
      .returning();
    return toType(r);
  }
}
