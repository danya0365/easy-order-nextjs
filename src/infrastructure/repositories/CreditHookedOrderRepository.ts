import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { CreditService } from "@/src/application/services/CreditService";
import type { OrderWithItems } from "@/src/domain/entities";

/**
 * Wraps the order repository so EVERY order path (counter, kiosk, online,
 * staff, rider, self-serve) goes through the credit wallet:
 *  - create(): low-balance gate (may throw CreditBlockedError), then the
 *    "placed" trigger;
 *  - setStatus(): accepted/completed triggers + refund on cancel.
 * Hook failures after the order write are logged, never surfaced — the order
 * itself must not fail because of a credit bookkeeping error; idempotency keys
 * let a later status change pick up a missed deduction.
 */
export function withCreditHooks(inner: IOrderRepository, credit: () => CreditService): IOrderRepository {
  const fire = async (o: OrderWithItems) => {
    try {
      await credit().onOrderEvent({
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
  };
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === "create") {
        return async (input: Parameters<IOrderRepository["create"]>[0]) => {
          await credit().assertCanTakeOrder(input.shopId);
          const o = await target.create(input);
          await fire(o);
          return o;
        };
      }
      if (prop === "setStatus") {
        return async (...args: Parameters<IOrderRepository["setStatus"]>) => {
          const o = await target.setStatus(...args);
          await fire(o);
          return o;
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
