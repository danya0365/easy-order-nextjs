import type { LoyaltyStampRedemption } from "@/src/domain/entities";

export interface CreateLoyaltyStampRedemptionInput {
  shopId: string;
  branchId?: string | null;
  customerId: string;
  cardId: string;
  stampTypeId?: string | null;
  rewardTextSnapshot: string;
  stampsSpent: number;
  performedBy: string;
}

export interface ILoyaltyStampRedemptionRepository {
  create(
    input: CreateLoyaltyStampRedemptionInput,
  ): Promise<LoyaltyStampRedemption>;
}
