import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { ShopPromotion } from "@/src/domain/entities";
import type {
  CreateShopPromotionInput,
  IShopPromotionRepository,
  UpdateShopPromotionInput,
} from "@/src/application/repositories/IShopPromotionRepository";

type Row = typeof schema.shopPromotions.$inferSelect;

function toPromotion(r: Row): ShopPromotion {
  return {
    id: r.id,
    shopId: r.shopId,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleShopPromotionRepository
  implements IShopPromotionRepository
{
  async create(input: CreateShopPromotionInput): Promise<ShopPromotion> {
    const [r] = await db
      .insert(schema.shopPromotions)
      .values({
        shopId: input.shopId,
        title: input.title,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      })
      .returning();
    return toPromotion(r);
  }

  async findById(id: string): Promise<ShopPromotion | null> {
    const r = await db.query.shopPromotions.findFirst({
      where: eq(schema.shopPromotions.id, id),
    });
    return r ? toPromotion(r) : null;
  }

  async listByShop(
    shopId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<ShopPromotion[]> {
    const where = opts?.activeOnly
      ? and(
          eq(schema.shopPromotions.shopId, shopId),
          eq(schema.shopPromotions.isActive, true),
        )
      : eq(schema.shopPromotions.shopId, shopId);
    const rows = await db.query.shopPromotions.findMany({
      where,
      orderBy: [
        asc(schema.shopPromotions.sortOrder),
        asc(schema.shopPromotions.createdAt),
      ],
    });
    return rows.map(toPromotion);
  }

  async update(
    id: string,
    input: UpdateShopPromotionInput,
  ): Promise<ShopPromotion> {
    const [r] = await db
      .update(schema.shopPromotions)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.shopPromotions.id, id))
      .returning();
    return toPromotion(r);
  }

  async setActive(id: string, isActive: boolean): Promise<ShopPromotion> {
    const [r] = await db
      .update(schema.shopPromotions)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(schema.shopPromotions.id, id))
      .returning();
    return toPromotion(r);
  }

  async delete(id: string): Promise<void> {
    await db.delete(schema.shopPromotions).where(eq(schema.shopPromotions.id, id));
  }
}
