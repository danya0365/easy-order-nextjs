import "server-only";

import type { OrderWithItems } from "@/src/domain/entities";
import { container } from "@/src/infrastructure/di/container";

/** An order as shown in the shop queue, with the customer's CRM note (if any). */
export type QueueOrder = OrderWithItems & { customerNote?: string | null };

/**
 * Attach each order's customer CRM note in ONE shop-scoped query. Used by every
 * path that feeds order cards: initial render, auto-refresh (router.refresh
 * re-runs the page) and history "load more".
 */
export async function withCustomerNotes(shopId: string, orders: OrderWithItems[]): Promise<QueueOrder[]> {
  const ids = [...new Set(orders.map((o) => o.customerId).filter((x): x is string => !!x))];
  if (ids.length === 0) return orders;
  const notes = await container.customerCrmRepository.notesFor(shopId, ids);
  return orders.map((o) => ({ ...o, customerNote: (o.customerId && notes.get(o.customerId)) || null }));
}
