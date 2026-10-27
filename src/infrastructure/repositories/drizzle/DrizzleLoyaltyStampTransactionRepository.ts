import "server-only";

import { db, schema } from "@/src/infrastructure/db/client";
import type { LoyaltyStampTransaction } from "@/src/domain/entities";
import type {
  CreateLoyaltyStampTxInput,
  ILoyaltyStampTransactionRepository,
} from "@/src/application/repositories/ILoyaltyStampTransactionRepository";

type Row = typeof schema.loyaltyStampTransactions.$inferSelect;

function toTx(r: Row): LoyaltyStampTransaction {
  return {
    id: r.id,
    shopId: r.shopId,
    branchId: r.branchId,
    customerId: r.customerId,
    cardId: r.cardId,
    stampTypeId: r.stampTypeId,
    type: r.type,
    quantity: r.quantity,
    performedBy: r.performedBy,
    note: r.note,
    createdAt: r.createdAt,
  };
}

export class DrizzleLoyaltyStampTransactionRepository
  implements ILoyaltyStampTransactionRepository
{
  async create(
    input: CreateLoyaltyStampTxInput,
  ): Promise<LoyaltyStampTransaction> {
    const [r] = await db
      .insert(schema.loyaltyStampTransactions)
      .values({
        shopId: input.shopId,
        branchId: input.branchId ?? null,
        customerId: input.customerId,
        cardId: input.cardId,
        stampTypeId: input.stampTypeId ?? null,
        type: input.type,
        quantity: input.quantity,
        performedBy: input.performedBy,
        note: input.note ?? null,
      })
      .returning();
    return toTx(r);
  }
}
