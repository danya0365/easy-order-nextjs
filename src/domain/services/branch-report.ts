import type { AnalyticsBreakdownRow, Branch } from "@/src/domain/entities";
import { mainBranchOf } from "@/src/domain/services/branch-ordering";

/**
 * Name + merge per-branch analytics rows: unassigned ("" key, legacy NULL
 * branch) folds into the main branch; every branch appears (0 when idle),
 * sorted by revenue desc.
 */
export function namedBranchRows(
  rows: readonly AnalyticsBreakdownRow[],
  branches: readonly Branch[],
): AnalyticsBreakdownRow[] {
  const mainId = mainBranchOf(branches)?.id ?? "";
  const acc = new Map<string, AnalyticsBreakdownRow>();
  for (const b of branches) {
    acc.set(b.id, { key: b.id, name: b.name, orders: 0, revenueSatang: 0 });
  }
  for (const r of rows) {
    const id = r.key || mainId;
    const cur = acc.get(id) ?? { key: id, name: id || "-", orders: 0, revenueSatang: 0 };
    cur.orders += r.orders;
    cur.revenueSatang += r.revenueSatang;
    acc.set(id, cur);
  }
  return [...acc.values()].sort((a, b) => b.revenueSatang - a.revenueSatang);
}
