import type { Shop, Subscription } from "@/src/domain/entities";
import {
  computeBillingState,
  type BillingStatus,
} from "@/src/domain/services/subscription-status";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import type { IPlatformSettingsRepository } from "@/src/application/repositories/IPlatformSettingsRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";

export interface BillingState {
  shop: Shop;
  subscription: Subscription | null;
  status: BillingStatus;
  /** Global switch: show the billing UI to shop owners at all. */
  billingUiEnabled: boolean;
  /** Global switch: actually suspend overdue shops (off = warn-only). */
  shopSuspensionEnabled: boolean;
}

/** Load a shop's billing snapshot and compute derived dunning/suspension. */
export class GetBillingStateUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly platformSettings: IPlatformSettingsRepository,
    private readonly orders: IOrderRepository,
  ) {}

  async execute(shopId: string, now: Date = new Date()): Promise<BillingState> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const subscription = await this.subscriptions.findByShop(shopId);
    const settings = await this.platformSettings.get();

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

    // Soft-launch switches relax billing pressure but NEVER lift an admin
    // suspension (suspendReason === "admin").
    let adjusted = status;

    // (c) Order-threshold soft launch: new shops with few orders stay free.
    if (
      settings.orderThresholdBillingEnabled &&
      (await this.orders.countByShop(shopId)) < settings.orderThresholdCount
    ) {
      adjusted = {
        ...adjusted,
        state: "active",
        isSuspended: false,
        suspendReason: "none",
        bannerLevel: 0,
        preExpiryBannerLevel: 0,
      };
    }

    // (d) Billing UI off: no overdue dunning or banners at all.
    if (!settings.billingUiEnabled) {
      adjusted = {
        ...adjusted,
        state: adjusted.suspendReason === "admin" ? "suspended" : "active",
        isSuspended: adjusted.suspendReason === "admin",
        suspendReason: adjusted.suspendReason === "admin" ? "admin" : "none",
        bannerLevel: 0,
        preExpiryBannerLevel: 0,
      };
    }

    // (e) Suspension enforcement off: overdue shops keep working (warn-only).
    // The overdue state/banner stays so the UI can still nag.
    if (!settings.shopSuspensionEnabled && adjusted.suspendReason === "overdue") {
      adjusted = { ...adjusted, isSuspended: false };
    }

    return {
      shop,
      subscription,
      status: adjusted,
      billingUiEnabled: settings.billingUiEnabled,
      shopSuspensionEnabled: settings.shopSuspensionEnabled,
    };
  }
}
