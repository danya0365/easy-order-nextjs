import type { LoyaltyStampType } from "@/src/domain/entities";

export interface CreateLoyaltyStampTypeInput {
  shopId: string;
  name: string;
  threshold: number;
  rewardText: string;
  priceSatang?: number | null;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateLoyaltyStampTypeInput {
  name?: string;
  threshold?: number;
  rewardText?: string;
  priceSatang?: number | null;
  sortOrder?: number;
}

export interface ILoyaltyStampTypeRepository {
  create(input: CreateLoyaltyStampTypeInput): Promise<LoyaltyStampType>;
  findById(id: string): Promise<LoyaltyStampType | null>;
  listByShop(
    shopId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<LoyaltyStampType[]>;
  countActive(shopId: string): Promise<number>;
  update(id: string, input: UpdateLoyaltyStampTypeInput): Promise<LoyaltyStampType>;
  setActive(id: string, isActive: boolean): Promise<LoyaltyStampType>;
}
