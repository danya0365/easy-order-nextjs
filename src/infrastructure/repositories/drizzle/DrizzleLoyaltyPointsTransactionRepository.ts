import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyPointsTransaction } from "@/src/domain/entities";
import type {
  CreateLoyaltyPointsTxInput,
  ILoyaltyPointsTransactionRepository,
} from "@/src/application/repositories/ILoyaltyPointsTransactionRepository";

type Row = typeof schema.loyaltyPointsTransactions.$inferSelect;

function toTx(r: Row): LoyaltyPointsTransaction {
  return {
    id: r.id,
    shopId: r.shopId,
    customerId: r.customerId,
    type: r.type,
    quantity: r.quantity,
    performedBy: r.performedBy,
    orderId: r.orderId,
    rewardId: r.rewardId,
    note: r.note,
    createdAt: r.createdAt,
  };
}

export class DrizzleLoyaltyPointsTransactionRepository
  implements ILoyaltyPointsTransactionRepository
{
  async create(
    input: CreateLoyaltyPointsTxInput,
  ): Promise<LoyaltyPointsTransaction> {
    const [r] = await db
      .insert(schema.loyaltyPointsTransactions)
      .values({
        shopId: input.shopId,
        customerId: input.customerId,
        type: input.type,
        quantity: input.quantity,
        performedBy: input.performedBy ?? null,
        orderId: input.orderId ?? null,
        rewardId: input.rewardId ?? null,
        note: input.note ?? null,
      })
      .returning();
    return toTx(r);
  }

  async findEarnByOrderId(
    shopId: string,
    orderId: string,
  ): Promise<LoyaltyPointsTransaction | null> {
    const r = await db.query.loyaltyPointsTransactions.findFirst({
      where: and(
        eq(schema.loyaltyPointsTransactions.shopId, shopId),
        eq(schema.loyaltyPointsTransactions.orderId, orderId),
        eq(schema.loyaltyPointsTransactions.type, "earn"),
      ),
    });
    return r ? toTx(r) : null;
  }
}
