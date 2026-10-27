import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyStampBalance } from "@/src/domain/entities";
import type { ILoyaltyStampBalanceRepository } from "@/src/application/repositories/ILoyaltyStampBalanceRepository";

type Row = typeof schema.loyaltyStampBalances.$inferSelect;

function toBalance(r: Row): LoyaltyStampBalance {
  return {
    id: r.id,
    cardId: r.cardId,
    stampTypeId: r.stampTypeId,
    currentStamps: r.currentStamps,
    lifetimeStamps: r.lifetimeStamps,
    rewardsEarned: r.rewardsEarned,
    updatedAt: r.updatedAt,
  };
}

export class DrizzleLoyaltyStampBalanceRepository
  implements ILoyaltyStampBalanceRepository
{
  async findByCardAndType(
    cardId: string,
    stampTypeId: string,
  ): Promise<LoyaltyStampBalance | null> {
    const r = await db.query.loyaltyStampBalances.findFirst({
      where: and(
        eq(schema.loyaltyStampBalances.cardId, cardId),
        eq(schema.loyaltyStampBalances.stampTypeId, stampTypeId),
      ),
    });
    return r ? toBalance(r) : null;
  }

  async findOrCreate(
    cardId: string,
    stampTypeId: string,
  ): Promise<LoyaltyStampBalance> {
    const existing = await this.findByCardAndType(cardId, stampTypeId);
    if (existing) return existing;
    const [r] = await db
      .insert(schema.loyaltyStampBalances)
      .values({ cardId, stampTypeId })
      .returning();
    return toBalance(r);
  }

  async listByCard(cardId: string): Promise<LoyaltyStampBalance[]> {
    const rows = await db.query.loyaltyStampBalances.findMany({
      where: eq(schema.loyaltyStampBalances.cardId, cardId),
    });
    return rows.map(toBalance);
  }

  async addStamps(id: string, delta: number): Promise<LoyaltyStampBalance> {
    const lifetimeDelta = Math.max(delta, 0);
    const [r] = await db
      .update(schema.loyaltyStampBalances)
      .set({
        currentStamps: sql`${schema.loyaltyStampBalances.currentStamps} + ${delta}`,
        lifetimeStamps: sql`${schema.loyaltyStampBalances.lifetimeStamps} + ${lifetimeDelta}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.loyaltyStampBalances.id, id))
      .returning();
    return toBalance(r);
  }

  async applyRedemption(
    id: string,
    threshold: number,
  ): Promise<LoyaltyStampBalance> {
    const [r] = await db
      .update(schema.loyaltyStampBalances)
      .set({
        currentStamps: sql`${schema.loyaltyStampBalances.currentStamps} - ${threshold}`,
        rewardsEarned: sql`${schema.loyaltyStampBalances.rewardsEarned} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.loyaltyStampBalances.id, id))
      .returning();
    return toBalance(r);
  }
}
