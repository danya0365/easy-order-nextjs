import type { LoyaltyPointsSettings } from "@/src/domain/entities";

export interface UpdateLoyaltyPointsSettingsInput {
  satangPerPoint?: number;
  minRedeemPoints?: number | null;
}

export interface ILoyaltyPointsSettingsRepository {
  getOrCreate(shopId: string): Promise<LoyaltyPointsSettings>;
  update(
    shopId: string,
    input: UpdateLoyaltyPointsSettingsInput,
  ): Promise<LoyaltyPointsSettings>;
}
