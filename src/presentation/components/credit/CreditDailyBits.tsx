import Link from "next/link";
import { CalendarCheck, CalendarX, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { CreditDailySettlement } from "@/src/application/repositories/ICreditRepository";
import type { CreditTodayProgress } from "@/src/application/services/CreditService";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Card } from "@/src/presentation/components/ui/Card";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";

/** Shop dashboard: today's sales vs the daily threshold. */
export async function CreditTodayCard({ p, href }: { p: CreditTodayProgress; href?: string }) {
  const t = await getTranslations("credit");
  const orders = p.metric === "orders";
  const v = orders ? p.orderCount : p.salesSatang, th = orders ? p.thresholdOrders : p.thresholdSatang;
  const pct = th > 0 ? Math.min(100, Math.round((v / th) * 100)) : 100;
  const body = (
    <div data-testid="credit-today">
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-brand-500" />
        <span className="text-sm font-semibold text-foreground">{t("todayTitle")}</span>
        <span className="ml-auto">{p.reached ? <Badge tone="warning">{t("todayReached")}</Badge> : <Badge tone="success">{t("todayNotReached")}</Badge>}</span>
      </div>
      <p className="text-sm text-foreground" data-testid="credit-today-text">
        {orders
          ? t("todayLineOrders", { orders: p.orderCount, threshold: p.thresholdOrders, fee: satangToBaht(p.feeSatang) })
          : t("todayLine", { sales: satangToBaht(p.salesSatang), threshold: satangToBaht(p.thresholdSatang), fee: satangToBaht(p.feeSatang) })}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted-surface">
        <div className={`h-full rounded-full ${p.reached ? "bg-warning" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted">{orders ? t("todayFootOrders", { date: p.businessDate, cutoff: p.cutoffTime, sales: satangToBaht(p.salesSatang) }) : t("todayFoot", { date: p.businessDate, cutoff: p.cutoffTime, orders: p.orderCount })}</p>
    </Card>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export async function DailySettlementList({ items, hrefFor }: { items: CreditDailySettlement[]; hrefFor: (s: CreditDailySettlement) => string }) {
  const t = await getTranslations("credit");
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted">{t("noDaily")}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border" data-testid="credit-daily-list">
      {items.map((s) => (
        <li key={s.id}>
          <Link href={hrefFor(s)} className="flex items-center gap-3 py-3 hover:bg-muted-surface/50" data-testid={`daily-row-${s.businessDate}`}>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${s.chargedSatang > 0 ? "bg-error-surface text-error" : "bg-success-surface text-success"}`}>
              {s.chargedSatang > 0 ? <CalendarCheck className="size-4" /> : <CalendarX className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium tabular-nums text-foreground">{s.businessDate}</span>
              <span className="block truncate text-xs text-muted">{s.metric === "orders"
                  ? t("dailyRowOrders", { orders: s.orderCount, threshold: s.thresholdOrders, sales: satangToBaht(s.salesSatang) })
                  : t("dailyRowSales", { sales: satangToBaht(s.salesSatang), orders: s.orderCount, threshold: satangToBaht(s.thresholdSatang) })}</span>
            </span>
            <span className="shrink-0">
              {s.chargedSatang > 0 ? <Badge tone="danger">{t("dailyCharged", { fee: satangToBaht(s.chargedSatang) })}</Badge> : <Badge tone="success">{t("dailyNotCharged")}</Badge>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function DailySettlementDetail({ s, ledgerHref }: { s: CreditDailySettlement; ledgerHref?: string | null }) {
  const t = await getTranslations("credit");
  const rows: Array<[string, React.ReactNode]> = [
    [t("dDate"), s.businessDate],
    [t("dPeriod"), `${formatDateTime(s.periodStart)} – ${formatDateTime(s.periodEnd)}`],
    [t("dCutoff"), s.cutoffTime],
    [t("dMetric"), s.metric === "orders" ? t("metricOrders") : t("metricSales")],
    [t("dOrders"), <span key="o" data-testid="daily-detail-orders">{s.orderCount}</span>],
    [t("dSales"), `฿${satangToBaht(s.salesSatang)}`],
    [t("dThreshold"), s.metric === "orders" ? t("ordersUnit", { n: s.thresholdOrders }) : `฿${satangToBaht(s.thresholdSatang)}`],
    [t("dFee"), `฿${satangToBaht(s.feeSatang)}`],
    [t("dCharged"), s.chargedSatang > 0 ? <span className="font-semibold text-error">−฿{satangToBaht(s.chargedSatang)}</span> : t("dailyNotCharged")],
    [t("dSettledBy"), s.settledBy?.startsWith("admin:") ? t("byAdmin") : t("byCron")],
    [t("dSettledAt"), formatDateTime(s.createdAt)],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm" data-testid="credit-daily-detail">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="text-foreground tabular-nums">{v}</dd>
        </div>
      ))}
      {ledgerHref && (
        <div className="contents">
          <dt className="text-muted">{t("dLedger")}</dt>
          <dd><Link href={ledgerHref} className="text-brand-600 underline">{t("viewEntry")}</Link></dd>
        </div>
      )}
    </dl>
  );
}
