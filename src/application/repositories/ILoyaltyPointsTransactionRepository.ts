import type {
  LoyaltyPointsTransaction,
  LoyaltyPointsTxType,
} from "@/src/domain/entities";

export interface CreateLoyaltyPointsTxInput {
  shopId: string;
  customerId: string;
  type: LoyaltyPointsTxType;
  quantity: number;
  performedBy?: string | null;
  orderId?: string | null;
  rewardId?: string | null;
  note?: string | null;
}

export interface ILoyaltyPointsTransactionRepository {
  create(input: CreateLoyaltyPointsTxInput): Promise<LoyaltyPointsTransaction>;
  /** First earn tx for an order (idempotency for earn-from-order). */
  findEarnByOrderId(
    shopId: string,
    orderId: string,
  ): Promise<LoyaltyPointsTransaction | null>;
}
