import type {
  LoyaltyStampTransaction,
  LoyaltyStampTxType,
} from "@/src/domain/entities";

export interface CreateLoyaltyStampTxInput {
  shopId: string;
  branchId?: string | null;
  customerId: string;
  cardId: string;
  stampTypeId?: string | null;
  type: LoyaltyStampTxType;
  quantity: number;
  performedBy: string;
  note?: string | null;
}

export interface ILoyaltyStampTransactionRepository {
  create(input: CreateLoyaltyStampTxInput): Promise<LoyaltyStampTransaction>;
}
