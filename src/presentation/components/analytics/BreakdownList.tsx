import { useTranslations } from "next-intl";

import type { AnalyticsBreakdownRow } from "@/src/domain/entities";
import { satangToBaht } from "@/src/presentation/lib/money";

/**
 * A compact breakdown (by order status / top customers / top shops): one row
 * each with a proportional bar of order count + the revenue. Server-rendered
 * (plain CSS bar — no chart lib needed for this simple view).
 */
export function BreakdownList({ rows }: { rows: AnalyticsBreakdownRow[] }) {
  const t = useTranslations("analytics");
  const max = Math.max(1, ...rows.map((r) => r.orders));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">{r.name}</span>
            <span className="shrink-0 text-muted">
              {t("breakdownRow", {
                orders: r.orders,
                revenue: satangToBaht(r.revenueSatang),
              })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted-surface">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.round((r.orders / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
