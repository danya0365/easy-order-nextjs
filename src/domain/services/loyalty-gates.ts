import type { Shop } from "../entities";

/** Module is live only when admin allowed AND shop enabled. */
export function isLoyaltyEffective(shop: Shop): boolean {
  return shop.loyaltyAllowedByAdmin && shop.loyaltyEnabled;
}

/** Stamp-card earn/redeem allowed. */
export function isStampCardOn(shop: Shop): boolean {
  return isLoyaltyEffective(shop) && shop.stampCardEnabled;
}

/** Spend-points earn/redeem allowed. */
export function isSpendPointsOn(shop: Shop): boolean {
  return isLoyaltyEffective(shop) && shop.spendPointsEnabled;
}
