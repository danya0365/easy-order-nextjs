import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import { computeBillingState } from "@/src/domain/services/subscription-status";

/**
 * Temporarily pause (close) a shop: freeze the billing clock so no paid day is
 * consumed while closed. Idempotent; refuses if the shop is already suspended.
 */
export class PauseShopUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly subscriptions: ISubscriptionRepository,
  ) {}

  async execute(shopId: string, now: Date = new Date()): Promise<void> {
    const sub = await this.subscriptions.findByShop(shopId);
    if (!sub) throw new Error("ไม่พบข้อมูลการใช้งานของร้าน");
    if (sub.pausedAt) return; // already paused — no-op

    const shop = await this.shops.findById(shopId);
    const state = computeBillingState(
      {
        currentPeriodDueAt: sub.currentPeriodDueAt,
        shopStatus: shop?.status,
        pausedAt: null,
      },
      now,
    );
    if (state.isSuspended) {
      throw new Error("ร้านถูกระงับอยู่ ไม่สามารถปิดชั่วคราวได้");
    }

    await this.subscriptions.pause(sub.id, now.toISOString());
  }
}
