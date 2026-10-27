import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyPointsBalance } from "@/src/domain/entities";
import type { ILoyaltyPointsBalanceRepository } from "@/src/application/repositories/ILoyaltyPointsBalanceRepository";

type Row = typeof schema.loyaltyPointsBalances.$inferSelect;

function toBalance(r: Row): LoyaltyPointsBalance {
  return {
    id: r.id,
    shopId: r.shopId,
    customerId: r.customerId,
    currentPoints: r.currentPoints,
    lifetimeEarned: r.lifetimeEarned,
    lifetimeRedeemed: r.lifetimeRedeemed,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleLoyaltyPointsBalanceRepository
  implements ILoyaltyPointsBalanceRepository
{
  async findByCustomer(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyPointsBalance | null> {
    const r = await db.query.loyaltyPointsBalances.findFirst({
      where: and(
        eq(schema.loyaltyPointsBalances.shopId, shopId),
        eq(schema.loyaltyPointsBalances.customerId, customerId),
      ),
    });
    return r ? toBalance(r) : null;
  }

  async findOrCreate(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyPointsBalance> {
    const existing = await this.findByCustomer(shopId, customerId);
    if (existing) return existing;
    const [r] = await db
      .insert(schema.loyaltyPointsBalances)
      .values({ shopId, customerId })
      .returning();
    return toBalance(r);
  }

  async addPoints(id: string, delta: number): Promise<LoyaltyPointsBalance> {
    const [r] = await db
      .update(schema.loyaltyPointsBalances)
      .set({
        currentPoints: sql`${schema.loyaltyPointsBalances.currentPoints} + ${delta}`,
        lifetimeEarned: sql`${schema.loyaltyPointsBalances.lifetimeEarned} + ${delta}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.loyaltyPointsBalances.id, id))
      .returning();
    return toBalance(r);
  }

  async applyRedeem(
    id: string,
    pointsCost: number,
  ): Promise<LoyaltyPointsBalance> {
    const [r] = await db
      .update(schema.loyaltyPointsBalances)
      .set({
        currentPoints: sql`${schema.loyaltyPointsBalances.currentPoints} - ${pointsCost}`,
        lifetimeRedeemed: sql`${schema.loyaltyPointsBalances.lifetimeRedeemed} + ${pointsCost}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.loyaltyPointsBalances.id, id))
      .returning();
    return toBalance(r);
  }
}
