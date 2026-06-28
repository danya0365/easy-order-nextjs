"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";

import type { AnalyticsDailyPoint } from "@/src/domain/entities";

/** "2026-06-15" -> "15/06" */
function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

/**
 * Daily order count (bars, left axis) vs revenue in baht (line, right axis)
 * over the selected range.
 */
export function DailyTrendChart({ data }: { data: AnalyticsDailyPoint[] }) {
  const t = useTranslations("analytics");
  const interval = Math.max(0, Math.ceil(data.length / 7) - 1);
  const rows = data.map((d) => ({
    day: d.day,
    orders: d.orders,
    revenue: Math.round(d.revenueSatang / 100),
  }));

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            interval={interval}
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted)"
          />
          <YAxis
            yAxisId="left"
            allowDecimals={false}
            width={32}
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted)"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            width={40}
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted)"
          />
          <Tooltip
            labelFormatter={(l) => shortDay(String(l))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="orders"
            name={t("ordersLabel")}
            fill="var(--color-brand-500)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Line
            yAxisId="right"
            dataKey="revenue"
            name={t("revenueLabel")}
            stroke="var(--color-accent-500)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
