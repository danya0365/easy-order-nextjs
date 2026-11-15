import type { Branch } from "@/src/domain/entities";

/**
 * Multi-branch ordering rules (pure). A shop's "main branch" is its oldest
 * branch (created with the shop). Orders with a NULL branch (legacy rows /
 * shops without any branch) belong to the main branch.
 */

/** Oldest branch (createdAt, then id) — the shop's main branch. */
/**
 * Branch staff may cancel orders of their OWN branch only when both the platform
 * switch (admin) and the shop's setting (owner) allow it. Owners always may.
 */
export function branchStaffMayCancel(platformEnabled: boolean, shopEnabled: boolean): boolean {
  return platformEnabled && shopEnabled;
}

export function mainBranchOf(branches: readonly Branch[]): Branch | null {
  if (branches.length === 0) return null;
  return [...branches].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )[0];
}

/**
 * Branch that takes an order: the requested branch when it belongs to the
 * shop, otherwise the main branch. Never trusts a foreign branch id.
 */
export function resolveOrderBranch(
  branches: readonly Branch[],
  requestedId: string | null | undefined,
): Branch | null {
  if (requestedId) {
    const hit = branches.find((b) => b.id === requestedId);
    if (hit) return hit;
  }
  return mainBranchOf(branches);
}

/** Thai reason a branch can't take new orders, or null when it can. */
export function branchClosedReason(branch: Branch | null): string | null {
  if (!branch) return null;
  if (!branch.isActive) return `สาขา "${branch.name}" ปิดให้บริการ`;
  if (!branch.acceptingOrders) return `สาขา "${branch.name}" ปิดรับออเดอร์ชั่วคราว`;
  return null;
}

/** Whether an order (by its branchId) belongs to `branchId`, NULL → main branch. */
export function orderInBranch(
  orderBranchId: string | null,
  branchId: string,
  mainBranchId: string | null,
): boolean {
  if (orderBranchId) return orderBranchId === branchId;
  return mainBranchId === branchId;
}
