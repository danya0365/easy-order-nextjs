import type { LoyaltyStampBalance } from "@/src/domain/entities";

export interface ILoyaltyStampBalanceRepository {
  findByCardAndType(
    cardId: string,
    stampTypeId: string,
  ): Promise<LoyaltyStampBalance | null>;
  findOrCreate(
    cardId: string,
    stampTypeId: string,
  ): Promise<LoyaltyStampBalance>;
  listByCard(cardId: string): Promise<LoyaltyStampBalance[]>;
  addStamps(id: string, delta: number): Promise<LoyaltyStampBalance>;
  applyRedemption(id: string, threshold: number): Promise<LoyaltyStampBalance>;
}
