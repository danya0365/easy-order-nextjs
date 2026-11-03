import type { Shop, Subscription } from "@/src/domain/entities";
import type { BillingStatus } from "@/src/domain/services/subscription-status";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";

export interface BillingState {
  shop: Shop;
  /** Kept only for the pause feature (pausedAt lives on the subscription row). */
  subscription: Subscription | null;
  status: BillingStatus;
}

/**
 * Shop operating state. The old day-based top-up / subscription billing and
 * the order-count daily fee are retired — payment is the prepaid credit wallet
 * (CreditService). Only two things can stop a shop here:
 *  - an explicit admin suspension (shops.status = suspended_by_admin)
 *  - a voluntary pause (subscription.pausedAt)
 * Running out of credit is handled by the credit low-balance mode (warn/block).
 */
export class GetBillingStateUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly subscriptions: ISubscriptionRepository,
  ) {}

  async execute(shopId: string): Promise<BillingState> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const subscription = await this.subscriptions.findByShop(shopId);
    const admin = shop.status === "suspended_by_admin";
    const paused = !admin && !!subscription?.pausedAt;
    const status: BillingStatus = {
      state: admin ? "suspended" : paused ? "paused" : "active",
      daysOverdue: 0,
      daysUntilDue: 0,
      isSuspended: admin,
      isPaused: paused,
      bannerLevel: 0,
      preExpiryBannerLevel: 0,
      graceDaysLeft: 0,
      suspendReason: admin ? "admin" : "none",
      frozenDaysSoFar: 0,
    };
    return { shop, subscription, status };
  }
}
