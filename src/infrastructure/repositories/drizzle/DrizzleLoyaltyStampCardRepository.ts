import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyStampCard } from "@/src/domain/entities";
import type { ILoyaltyStampCardRepository } from "@/src/application/repositories/ILoyaltyStampCardRepository";

type Row = typeof schema.loyaltyStampCards.$inferSelect;

function toCard(r: Row): LoyaltyStampCard {
  return {
    id: r.id,
    shopId: r.shopId,
    customerId: r.customerId,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleLoyaltyStampCardRepository
  implements ILoyaltyStampCardRepository
{
  async findByCustomer(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyStampCard | null> {
    const r = await db.query.loyaltyStampCards.findFirst({
      where: and(
        eq(schema.loyaltyStampCards.shopId, shopId),
        eq(schema.loyaltyStampCards.customerId, customerId),
      ),
    });
    return r ? toCard(r) : null;
  }

  async findOrCreate(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyStampCard> {
    const existing = await this.findByCustomer(shopId, customerId);
    if (existing) return existing;
    const [r] = await db
      .insert(schema.loyaltyStampCards)
      .values({ shopId, customerId })
      .returning();
    return toCard(r);
  }
}
