import type { LoyaltyPointsReward } from "@/src/domain/entities";

export interface CreateLoyaltyPointsRewardInput {
  shopId: string;
  name: string;
  pointsCost: number;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateLoyaltyPointsRewardInput {
  name?: string;
  pointsCost?: number;
  description?: string | null;
  sortOrder?: number;
}

export interface ILoyaltyPointsRewardRepository {
  create(input: CreateLoyaltyPointsRewardInput): Promise<LoyaltyPointsReward>;
  findById(id: string): Promise<LoyaltyPointsReward | null>;
  listByShop(
    shopId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<LoyaltyPointsReward[]>;
  update(
    id: string,
    input: UpdateLoyaltyPointsRewardInput,
  ): Promise<LoyaltyPointsReward>;
  setActive(id: string, isActive: boolean): Promise<LoyaltyPointsReward>;
}
