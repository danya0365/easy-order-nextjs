import "server-only";

import { container } from "@/src/infrastructure/di/container";
import {
  queueBranchFilter,
  type OrderQueueScope,
} from "@/src/infrastructure/auth/order-queue-scope";
import { withCustomerNotes } from "@/src/presentation/lib/order-notes";
import { ListRidersWithLoadUseCase } from "@/src/application/use-cases/rider/RiderUseCases";

/**
 * Everything the order-queue screen needs, scoped to a branch: staff are
 * pinned to theirs; an owner may pass `requested` (branch id) or see all.
 * Riders are shop-level (any rider can take any branch's order).
 */
export async function loadOrderQueue(
  scope: OrderQueueScope,
  requested?: string | null,
) {
  const filter = queueBranchFilter(scope, requested);
  const [activeOrders, history, riders] = await Promise.all([
    container.orderRepository.listActiveByShop(scope.shopId, filter),
    container.orderRepository.pageHistoryByShop(scope.shopId, {}, filter),
    new ListRidersWithLoadUseCase(
      container.riderRepository,
      container.orderRepository,
    ).execute(scope.shopId),
  ]);
  const [active, hist] = await Promise.all([
    withCustomerNotes(scope.shopId, activeOrders),
    withCustomerNotes(scope.shopId, history.items),
  ]);
  const branchNames =
    scope.branches.length > 1
      ? Object.fromEntries(scope.branches.map((b) => [b.id, b.name]))
      : undefined;
  return {
    active,
    hist,
    historyCursor: history.nextCursor,
    selectedBranchId: filter?.branchId ?? null,
    branchNames,
    riders: riders
      .filter((r) => r.active && r.status === "approved")
      .map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        lineId: r.lineId,
        available: r.available,
        openJobs: r.openJobs,
        avatarUrl: r.avatarUrl,
      })),
  };
}
