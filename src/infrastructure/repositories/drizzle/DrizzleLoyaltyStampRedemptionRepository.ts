import "server-only";

import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyStampRedemption } from "@/src/domain/entities";
import type {
  CreateLoyaltyStampRedemptionInput,
  ILoyaltyStampRedemptionRepository,
} from "@/src/application/repositories/ILoyaltyStampRedemptionRepository";

type Row = typeof schema.loyaltyStampRedemptions.$inferSelect;

function toRedemption(r: Row): LoyaltyStampRedemption {
  return {
    id: r.id,
    shopId: r.shopId,
    branchId: r.branchId,
    customerId: r.customerId,
    cardId: r.cardId,
    stampTypeId: r.stampTypeId,
    rewardTextSnapshot: r.rewardTextSnapshot,
    stampsSpent: r.stampsSpent,
    performedBy: r.performedBy,
    createdAt: r.createdAt,
  };
}

export class DrizzleLoyaltyStampRedemptionRepository
  implements ILoyaltyStampRedemptionRepository
{
  async create(
    input: CreateLoyaltyStampRedemptionInput,
  ): Promise<LoyaltyStampRedemption> {
    const [r] = await db
      .insert(schema.loyaltyStampRedemptions)
      .values({
        shopId: input.shopId,
        branchId: input.branchId ?? null,
        customerId: input.customerId,
        cardId: input.cardId,
        stampTypeId: input.stampTypeId ?? null,
        rewardTextSnapshot: input.rewardTextSnapshot,
        stampsSpent: input.stampsSpent,
        performedBy: input.performedBy,
      })
      .returning();
    return toRedemption(r);
  }
}
