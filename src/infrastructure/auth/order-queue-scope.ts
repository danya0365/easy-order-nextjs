import "server-only";

import { container } from "@/src/infrastructure/di/container";
import { operatorContext } from "@/src/infrastructure/auth/session";
import {
  mainBranchOf,
  orderInBranch,
} from "@/src/domain/services/branch-ordering";
import type { Branch, User } from "@/src/domain/entities";
import type { OrderBranchFilter } from "@/src/application/repositories/IOrderRepository";

/**
 * Who may work the order queue, and over which branch.
 *  - shop_owner / impersonating admin: every branch (optional filter).
 *  - branch_staff: ONLY their own branch (when the platform switch allows it).
 */
export interface OrderQueueScope {
  actor: User;
  shopId: string;
  isStaff: boolean;
  /** Fixed branch for staff; null for owner (= all branches). */
  staffBranchId: string | null;
  branches: Branch[];
  mainBranchId: string | null;
}

export async function orderQueueScope(): Promise<OrderQueueScope> {
  const ctx = await operatorContext();
  const isStaff = ctx.actor.role === "branch_staff";
  const branches = await container.branchRepository.listByShop(ctx.shopId);
  const mainBranchId = mainBranchOf(branches)?.id ?? null;
  if (isStaff) {
    const settings = await container.platformSettingsRepository.get();
    if (!settings.branchStaffQueueEnabled) {
      throw new Error("ระบบยังไม่เปิดให้พนักงานสาขาจัดการคิวออเดอร์");
    }
    if (!ctx.branchId || !branches.some((b) => b.id === ctx.branchId)) {
      throw new Error("บัญชีพนักงานนี้ยังไม่ได้ผูกกับสาขา");
    }
  }
  return {
    actor: ctx.actor,
    shopId: ctx.shopId,
    isStaff,
    staffBranchId: isStaff ? ctx.branchId : null,
    branches,
    mainBranchId,
  };
}

/**
 * Repository filter for a queue view. Staff are always pinned to their branch;
 * owners may pick one (`requested`) or see all (null / "all" / unknown id).
 */
export function queueBranchFilter(
  scope: OrderQueueScope,
  requested?: string | null,
): OrderBranchFilter | undefined {
  const branchId =
    scope.staffBranchId ??
    (requested && scope.branches.some((b) => b.id === requested) ? requested : null);
  if (!branchId) return undefined;
  return { branchId, includeUnassigned: branchId === scope.mainBranchId };
}

/** Throws when a branch_staff touches an order of another branch. */
export async function assertOrderInQueueScope(
  scope: OrderQueueScope,
  orderId: string,
): Promise<void> {
  const order = await container.orderRepository.findById(scope.shopId, orderId);
  if (!order) throw new Error("ไม่พบออเดอร์");
  if (
    scope.staffBranchId &&
    !orderInBranch(order.branchId, scope.staffBranchId, scope.mainBranchId)
  ) {
    throw new Error("ออเดอร์นี้เป็นของสาขาอื่น");
  }
}
