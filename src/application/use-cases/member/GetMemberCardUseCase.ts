import type { Customer, Shop } from "@/src/domain/entities";
import type { ICustomerCrmRepository } from "@/src/application/repositories/ICustomerCrmRepository";
import type { ILoyaltyPointsBalanceRepository } from "@/src/application/repositories/ILoyaltyPointsBalanceRepository";
import { isSpendPointsOn } from "@/src/domain/services/loyalty-gates";

export interface MemberCard {
  displayName: string;
  phone: string;
  memberSince: string;
  orderCount: number;
  /** null when the shop's spend-points module is off. */
  points: number | null;
}

/**
 * "Who am I" card for a device-bound member on the shop's history page:
 * name, phone, member since, order count and (if enabled) points balance.
 */
export class GetMemberCardUseCase {
  constructor(
    private readonly crm: ICustomerCrmRepository,
    private readonly points: ILoyaltyPointsBalanceRepository,
  ) {}

  async execute(shop: Shop, customer: Customer): Promise<MemberCard> {
    const showPoints = isSpendPointsOn(shop);
    const [stats, balance] = await Promise.all([
      this.crm.detailStats(shop.id, customer.id),
      showPoints
        ? this.points.findByCustomer(shop.id, customer.id)
        : Promise.resolve(null),
    ]);
    return {
      displayName: customer.displayName ?? "",
      phone: customer.phone,
      memberSince: customer.createdAt,
      orderCount: stats.orderCount,
      points: showPoints ? (balance?.currentPoints ?? 0) : null,
    };
  }
}
