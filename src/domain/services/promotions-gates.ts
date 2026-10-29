import type { Shop } from "../entities";

/** Module is live only when admin allowed AND shop enabled. */
export function isPromotionsEffective(shop: Shop): boolean {
  return shop.promotionsAllowedByAdmin && shop.promotionsEnabled;
}
