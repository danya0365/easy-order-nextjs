import type { LoyaltyPointsBalance, Order } from "@/src/domain/entities";
import { isSpendPointsOn } from "@/src/domain/services/loyalty-gates";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ILoyaltyPointsSettingsRepository } from "@/src/application/repositories/ILoyaltyPointsSettingsRepository";
import type { ILoyaltyPointsBalanceRepository } from "@/src/application/repositories/ILoyaltyPointsBalanceRepository";
import type { ILoyaltyPointsTransactionRepository } from "@/src/application/repositories/ILoyaltyPointsTransactionRepository";

/**
 * Award floor(totalSatang / satangPerPoint) when an order is paid and the
 * spend-points kind is on. Idempotent per orderId. No-op when no customer.
 */
export class EarnPointsFromOrderUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly settings: ILoyaltyPointsSettingsRepository,
    private readonly balances: ILoyaltyPointsBalanceRepository,
    private readonly transactions: ILoyaltyPointsTransactionRepository,
  ) {}

  async execute(order: Order): Promise<LoyaltyPointsBalance | null> {
    if (!order.customerId) return null;

    const shop = await this.shops.findById(order.shopId);
    if (!shop || !isSpendPointsOn(shop)) return null;

    const existing = await this.transactions.findEarnByOrderId(
      order.shopId,
      order.id,
    );
    if (existing) return null;

    const settings = await this.settings.getOrCreate(order.shopId);
    const points = Math.floor(order.totalSatang / settings.satangPerPoint);
    if (points < 1) return null;

    const balance = await this.balances.findOrCreate(
      order.shopId,
      order.customerId,
    );
    const updated = await this.balances.addPoints(balance.id, points);
    await this.transactions.create({
      shopId: order.shopId,
      customerId: order.customerId,
      type: "earn",
      quantity: points,
      performedBy: null,
      orderId: order.id,
      note: `รับแต้มจากออเดอร์ #${order.orderNo}`,
    });
    return updated;
  }
}
