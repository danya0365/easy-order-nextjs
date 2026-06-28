import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import {
  GetPlatformAnalyticsUseCase,
} from "@/src/application/use-cases/analytics/GetPlatformAnalyticsUseCase";
import {
  ANALYTICS_RANGES,
  normalizeRange,
} from "@/src/application/use-cases/analytics/GetShopAnalyticsUseCase";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { DailyTrendChart } from "@/src/presentation/components/analytics/DailyTrendChart";
import { BreakdownList } from "@/src/presentation/components/analytics/BreakdownList";
import { satangToBaht } from "@/src/presentation/lib/money";
import { cn } from "@/src/presentation/components/ui/cn";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  await requireRole("platform_admin");
  const t = await getTranslations("analytics");

  const range = normalizeRange(days);
  const data = await new GetPlatformAnalyticsUseCase(
    container.platformAnalyticsRepository,
  ).execute(range);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {ANALYTICS_RANGES.map((d) => (
          <Link
            key={d}
            href={`/admin/analytics?days=${d}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              d === range
                ? "bg-brand-500 text-on-brand"
                : "bg-muted-surface text-muted hover:text-foreground",
            )}
          >
            {t("rangeDays", { days: d })}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("summaryOrders")} value={String(data.summary.orders)} />
        <Stat
          label={t("summaryRevenue")}
          value={`฿${satangToBaht(data.summary.revenueSatang)}`}
        />
        <Stat label={t("summaryShops")} value={String(data.summary.customers)} />
      </div>

      <Card>
        <CardHeader title={t("trendTitle")} />
        {data.summary.orders === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <DailyTrendChart data={data.daily} />
        )}
      </Card>

      <Card>
        <CardHeader title={t("byShopTitle")} />
        {data.byShop.length === 0 ? (
          <p className="text-sm text-muted">{t("noData")}</p>
        ) : (
          <BreakdownList rows={data.byShop} />
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
