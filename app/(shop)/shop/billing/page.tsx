import { CalendarClock, Package, Receipt, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { TopupForm } from "@/src/presentation/components/billing/TopupForm";
import { PaymentHistoryList } from "@/src/presentation/components/billing/PaymentHistoryList";
import { TopupHistoryList } from "@/src/presentation/components/billing/TopupHistoryList";
import { ContactAdminButton } from "@/src/presentation/components/shop/ContactAdminButton";
import { formatDate } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

export default async function ShopBillingPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const { subscription, status } = await getBillingState(shopId);
  const paymentsPage = await container.paymentRepository.pageByShop(shopId);
  const topupsPage = await container.topupTransactionRepository.pageByShop(shopId);

  return (
    <div className="flex flex-col gap-4">
      {/* Loss-aversion lock notice */}
      {status.isSuspended && (
        <Card className="bg-error-surface ring-1 ring-error">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-6 shrink-0 text-error" />
            <div>
              <p className="font-semibold text-error">{t("suspendedTitle")}</p>
              <p className="mt-1 text-sm text-foreground">{t("suspendedBody")}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Status */}
      <Card>
        <CardHeader title={t("daysRemainingTitle")} />
        {!subscription ? (
          <EmptyState
            icon={<Package />}
            title={t("noPackageTitle")}
            description={t("noPackageDesc")}
          />
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t("statusLabel")}</span>
              {status.isSuspended ? (
                <Badge tone="danger">{t("statusSuspended")}</Badge>
              ) : status.state === "overdue" ? (
                <Badge tone="warning">
                  {t("statusOverdue", { days: status.daysOverdue })}
                </Badge>
              ) : subscription.status === "trialing" ? (
                <Badge tone="success">{t("statusTrialing")}</Badge>
              ) : (
                <Badge tone="success">{t("statusActive")}</Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t("usableUntil")}</span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <CalendarClock className="size-4 text-muted" />
                {formatDate(subscription.currentPeriodDueAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t("remaining")}</span>
              <span className="font-semibold text-foreground">
                {status.state === "active"
                  ? t("remainingDays", { days: status.daysUntilDue })
                  : status.isSuspended
                    ? "—"
                    : t("overdueTopup", { days: status.graceDaysLeft })}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Top up */}
      {subscription && (
        <Card>
          <CardHeader
            title={t("topupTitle")}
            subtitle={t("topupSubtitle")}
          />
          <TopupForm pricePerDaySatang={subscription.pricePerDaySatang} />
        </Card>
      )}

      {/* Days credited (ledger) */}
      {topupsPage.items.length > 0 && (
        <Card>
          <CardHeader
            title={t("creditedHistoryTitle")}
            subtitle={t("creditedHistorySubtitle")}
          />
          <TopupHistoryList
            initialItems={topupsPage.items}
            initialCursor={topupsPage.nextCursor}
          />
        </Card>
      )}

      {/* Slip submission history */}
      <Card>
        <CardHeader title={t("paymentHistoryTitle")} />
        {paymentsPage.items.length === 0 ? (
          <EmptyState icon={<Receipt />} title={t("noPaymentHistory")} />
        ) : (
          <PaymentHistoryList
            initialItems={paymentsPage.items}
            initialCursor={paymentsPage.nextCursor}
          />
        )}
      </Card>

      {/* Help: contacting the admin is most useful here (rejected / suspended). */}
      <Card>
        <CardHeader
          title={t("paymentProblemTitle")}
          subtitle={t("paymentProblemSubtitle")}
        />
        <ContactAdminButton />
      </Card>
    </div>
  );
}
