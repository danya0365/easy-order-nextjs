import type {
  Customer,
  CustomerStampCardView,
  LoyaltyStampBalance,
  LoyaltyStampType,
} from "../entities";

/**
 * Build the derived multi-type stamp card view. `types` should already be the
 * shop's ACTIVE types in display order; missing balances mean zero stamps.
 */
export function buildStampCardView(
  types: LoyaltyStampType[],
  customer: Customer,
  balances: LoyaltyStampBalance[],
): CustomerStampCardView {
  const byType = new Map(balances.map((b) => [b.stampTypeId, b]));
  return {
    customer,
    types: types.map((type) => {
      const b = byType.get(type.id);
      const currentStamps = b?.currentStamps ?? 0;
      return {
        type,
        currentStamps,
        lifetimeStamps: b?.lifetimeStamps ?? 0,
        rewardsEarned: b?.rewardsEarned ?? 0,
        eligibleToRedeem: currentStamps >= type.threshold,
        remaining: Math.max(0, type.threshold - currentStamps),
      };
    }),
  };
}
