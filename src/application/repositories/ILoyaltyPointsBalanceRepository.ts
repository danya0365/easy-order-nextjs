import type { LoyaltyPointsBalance } from "@/src/domain/entities";

export interface ILoyaltyPointsBalanceRepository {
  findByCustomer(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyPointsBalance | null>;
  findOrCreate(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyPointsBalance>;
  /** Add positive points (earn). Bumps lifetimeEarned. */
  addPoints(id: string, delta: number): Promise<LoyaltyPointsBalance>;
  /** Subtract pointsCost and bump lifetimeRedeemed. */
  applyRedeem(id: string, pointsCost: number): Promise<LoyaltyPointsBalance>;
}
