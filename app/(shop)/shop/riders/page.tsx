import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import {
  ListRidersPageUseCase,
  RiderPayoutSummaryUseCase,
} from "@/src/application/use-cases/rider/RiderUseCases";
import { RidersManager } from "@/src/presentation/components/rider/RidersManager";
import { Card } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { satangToBaht } from "@/src/presentation/lib/money";

export const dynamic = "force-dynamic";

/** YYYY-MM-DD (Bangkok) for an instant. */
function bkkDate(d: Date): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}
/** 00:00 Bangkok of a YYYY-MM-DD as UTC ISO. */
function bkkStartISO(ymd: string): string {
  return new Date(`${ymd}T00:00:00+07:00`).toISOString();
}
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function ShopRidersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("rider");
  const sp = await searchParams;
  const today = bkkDate(new Date());
  const from = sp.from && YMD.test(sp.from) ? sp.from : today;
  const to = sp.to && YMD.test(sp.to) && sp.to >= from ? sp.to : from;
  const toExclusive = new Date(new Date(bkkStartISO(to)).getTime() + 86400_000).toISOString();

  const [result, payouts] = await Promise.all([
    new ListRidersPageUseCase(container.riderRepository, container.orderRepository).execute(
      shopId,
      Number(sp.page) || 1,
      10,
    ),
    new RiderPayoutSummaryUseCase(container.riderRepository).execute(
      shopId,
      bkkStartISO(from),
      toExclusive,
    ),
  ]);
  const total = payouts.reduce(
    (s, r) => ({
      trips: s.trips + r.trips,
      commission: s.commission + r.commissionSatang,
      cod: s.cod + r.codCollectedSatang,
    }),
    { trips: 0, commission: 0, cod: 0 },
  );
  const pageQuery = (p: number): string => {
    const q = new URLSearchParams();
    if (sp.from || sp.to) {
      q.set("from", from);
      q.set("to", to);
    }
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/shop/riders?${s}` : "/shop/riders";
  };
  const prevPage = result.page > 1 ? pageQuery(result.page - 1) : null;
  const nextPage = result.page < result.pageCount ? pageQuery(result.page + 1) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("pageTitle")}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {t("pageSubtitle")}
        </p>
      </div>

      <RidersManager riders={result.items} />

      <div data-testid="riders-pagination" className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {t("pageOf", { page: result.page, count: result.pageCount })} · {t("totalRiders", { total: result.total })}
        </p>
        <div className="flex items-center gap-2">
          {prevPage ? (
            <Link
              href={prevPage}
              data-testid="riders-prev"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted-surface"
            >
              <ChevronLeft className="size-4" />
              {t("prevPage")}
            </Link>
          ) : (
            <span
              data-testid="riders-prev"
              aria-disabled
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted opacity-50"
            >
              <ChevronLeft className="size-4" />
              {t("prevPage")}
            </span>
          )}
          {nextPage ? (
            <Link
              href={nextPage}
              data-testid="riders-next"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted-surface"
            >
              {t("nextPage")}
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span
              data-testid="riders-next"
              aria-disabled
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted opacity-50"
            >
              {t("nextPage")}
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      </div>

      <Card>
        <h2 className="font-semibold text-foreground">{t("payoutTitle")}</h2>
        <p className="text-xs text-muted">{t("payoutHint")}</p>
        <form method="get" className="mt-3 flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1 text-muted">
            {t("from")}
            <input type="date" name="from" defaultValue={from} className="rounded-lg border border-border bg-card px-2 py-1 text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-muted">
            {t("to")}
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-border bg-card px-2 py-1 text-foreground" />
          </label>
          <Button type="submit" size="sm" variant="outline">{t("viewSummary")}</Button>
        </form>
        {payouts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("payoutEmpty")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table data-testid="rider-payouts" className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 pr-2">{t("colRider")}</th>
                  <th className="py-1 pr-2 text-right">{t("colTrips")}</th>
                  <th className="py-1 pr-2 text-right">{t("colCommission")}</th>
                  <th className="py-1 text-right">{t("colCod")}</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.riderId} className="border-t border-border text-foreground">
                    <td className="py-1.5 pr-2">{p.riderName}</td>
                    <td className="py-1.5 pr-2 text-right">{p.trips}</td>
                    <td className="py-1.5 pr-2 text-right">{satangToBaht(p.commissionSatang)}</td>
                    <td className="py-1.5 text-right">{satangToBaht(p.codCollectedSatang)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border font-semibold text-foreground">
                  <td className="py-1.5 pr-2">{t("total")}</td>
                  <td className="py-1.5 pr-2 text-right">{total.trips}</td>
                  <td className="py-1.5 pr-2 text-right">{satangToBaht(total.commission)}</td>
                  <td className="py-1.5 text-right">{satangToBaht(total.cod)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
