import { CalendarClock, ReceiptText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { DailyFeeOverview } from "@/src/application/use-cases/billing/DailyFeeUseCases";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { satangToBaht } from "@/src/presentation/lib/money";

/** Today's count vs threshold + outstanding + charge history (owner & admin). */
export async function DailyFeePanel({
  overview,
  markPaid,
}: {
  overview: DailyFeeOverview;
  /** Admin-only: render a "mark paid" form per due charge. */
  markPaid?: { action: (fd: FormData) => Promise<void>; shopId: string };
}) {
  const t = await getTranslations("dailyFee");
  const { today, upcomingTerms, charges, outstandingSatang } = overview;
  const over = today.orderCount > today.terms.threshold;

  return (
    <>
      <div data-testid="daily-fee-today">
      <Card>
        <CardHeader title={t("todayTitle")} subtitle={t("todaySubtitle", { date: today.businessDate })} />
        <div className="flex flex-col gap-2 text-sm">
          {!today.terms.enabled && (
            <p className="text-muted">{t("disabledNote")}</p>
          )}
          <div className="flex justify-between">
            <span className="text-muted">{t("todayCount")}</span>
            <span data-testid="daily-fee-count" className="font-semibold text-foreground">
              {t("countVsThreshold", { count: today.orderCount, threshold: today.terms.threshold })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t("projected")}</span>
            <span data-testid="daily-fee-projected" className={over && today.terms.enabled ? "font-semibold text-warning" : "text-foreground"}>
              ฿{satangToBaht(today.projectedFeeSatang)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t("rule")}</span>
            <span className="text-foreground">
              {t("ruleText", { threshold: today.terms.threshold, fee: satangToBaht(today.terms.feeSatang) })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t("closesAt")}</span>
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <CalendarClock className="size-4 text-muted" />
              {formatDateTime(today.end)}
            </span>
          </div>
          {upcomingTerms && (
            <p className="text-xs text-muted">
              {t("upcoming", {
                enabled: upcomingTerms.enabled ? t("on") : t("off"),
                threshold: upcomingTerms.threshold,
                fee: satangToBaht(upcomingTerms.feeSatang),
                cutoff: upcomingTerms.cutoffTime,
              })}
            </p>
          )}
        </div>
      </Card>
      </div>

      <Card>
        <CardHeader title={t("outstandingTitle")} subtitle={t("noAutoDebit")} />
        <p data-testid="daily-fee-outstanding" className="text-2xl font-semibold text-foreground">
          ฿{satangToBaht(outstandingSatang)}
        </p>
      </Card>

      <Card>
        <CardHeader title={t("historyTitle")} />
        {charges.length === 0 ? (
          <EmptyState icon={<ReceiptText />} title={t("noCharges")} />
        ) : (
          <ul data-testid="daily-fee-charges" className="flex flex-col divide-y divide-border text-sm">
            {charges.map((c) => (
              <li key={c.id} data-testid="daily-fee-charge" className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium text-foreground">{c.businessDate}</p>
                  <p className="text-xs text-muted">
                    {t("chargeLine", { count: c.orderCount, threshold: c.threshold, cutoff: c.cutoffTime })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">฿{satangToBaht(c.amountSatang)}</span>
                  {c.status === "due" ? (
                    <Badge tone="warning">{t("statusDue")}</Badge>
                  ) : c.status === "paid" ? (
                    <Badge tone="success">{t("statusPaid")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("statusNone")}</Badge>
                  )}
                  {markPaid && c.status === "due" && (
                    <form action={markPaid.action}>
                      <input type="hidden" name="shopId" value={markPaid.shopId} />
                      <input type="hidden" name="chargeId" value={c.id} />
                      <button type="submit" data-testid="mark-paid" className="rounded-md bg-brand-500 px-2 py-1 text-xs font-medium text-white">
                        {t("markPaid")}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
