import type { Shop, Subscription } from "@/src/domain/entities";
import {
  computeBillingState,
  type BillingStatus,
} from "@/src/domain/services/subscription-status";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";

export interface BillingState {
  shop: Shop;
  subscription: Subscription | null;
  status: BillingStatus;
}

/** Load a shop's billing snapshot and compute derived dunning/suspension. */
export class GetBillingStateUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly subscriptions: ISubscriptionRepository,
  ) {}

  async execute(shopId: string, now: Date = new Date()): Promise<BillingState> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const subscription = await this.subscriptions.findByShop(shopId);

    // No subscription yet → treat as active (trial/just created).
    const status: BillingStatus = subscription
      ? computeBillingState(
          {
            currentPeriodDueAt: subscription.currentPeriodDueAt,
            status: subscription.status,
            shopStatus: shop.status,
            pausedAt: subscription.pausedAt,
          },
          now,
        )
      : {
          state: shop.status === "suspended_by_admin" ? "suspended" : "active",
          daysOverdue: 0,
          daysUntilDue: 0,
          isSuspended: shop.status === "suspended_by_admin",
          isPaused: false,
          bannerLevel: 0,
          preExpiryBannerLevel: 0,
          graceDaysLeft: 7,
          suspendReason: shop.status === "suspended_by_admin" ? "admin" : "none",
          frozenDaysSoFar: 0,
        };

    return { shop, subscription, status };
  }
}
