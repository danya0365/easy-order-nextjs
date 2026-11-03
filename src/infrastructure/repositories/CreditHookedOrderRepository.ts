import type { CreateOrderInput, IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { CreditService } from "@/src/application/services/CreditService";
import type { OrderWithItems } from "@/src/domain/entities";
import { DrizzleOrderRepository } from "@/src/infrastructure/repositories/drizzle/DrizzleOrderRepository";

/**
 * Order repository with the prepaid-credit wallet hooked in, so EVERY order
 * path (counter, kiosk, online, staff, rider, self-serve) goes through it:
 *  - create(): low-balance gate (may throw CreditBlockedError), then the
 *    "placed" trigger;
 *  - setStatus(): accepted/completed triggers + refund on cancel.
 *
 * A plain subclass (not a Proxy): every other method is the untouched
 * DrizzleOrderRepository method. While the master switch is off each hook is a
 * single per-request-memoised config read (see CreditService.isMasterEnabled).
 * Hook failures after the order write are logged, never surfaced; the
 * idempotency keys let a later status change pick up a missed deduction.
 */
export class CreditHookedOrderRepository extends DrizzleOrderRepository {
  constructor(private readonly credit: () => CreditService) {
    super();
  }

  private async fire(o: OrderWithItems): Promise<void> {
    try {
      await this.credit().onOrderEvent({
        id: o.id,
        shopId: o.shopId,
        status: o.status,
        totalSatang: o.totalSatang,
        subtotalSatang: o.subtotalSatang,
        orderNo: o.orderNo,
      });
    } catch (e) {
      console.error("[credit] order hook failed", o.id, (e as Error).message);
    }
  }

  override async create(input: CreateOrderInput): Promise<OrderWithItems> {
    await this.credit().assertCanTakeOrder(input.shopId);
    const o = await super.create(input);
    await this.fire(o);
    return o;
  }

  override async setStatus(...args: Parameters<IOrderRepository["setStatus"]>): Promise<OrderWithItems> {
    const o = await super.setStatus(...args);
    await this.fire(o);
    return o;
  }
}
