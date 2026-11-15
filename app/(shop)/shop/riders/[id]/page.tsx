import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { GetShopRiderDetailUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { RiderAvatar } from "@/src/presentation/components/rider/RiderAvatar";
import { RidersManager } from "@/src/presentation/components/rider/RidersManager";
import { RevokeRiderButton } from "@/src/presentation/components/rider/RevokeRiderButton";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Card } from "@/src/presentation/components/ui/Card";
import { satangToBaht } from "@/src/presentation/lib/money";

export const dynamic = "force-dynamic";

const THB_TIME = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ShopRiderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId } = await requireShopAccess();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) notFound();
  const detail = await new GetShopRiderDetailUseCase(
    container.riderRepository,
    container.orderRepository,
  ).execute(shopId, id);
  if (!detail) notFound();
  const t = await getTranslations("rider");
  const { rider, recent, last30 } = detail;
  const commission =
    rider.commissionType === "per_trip"
      ? t("commissionPerTrip", { amount: (rider.commissionValue / 100).toLocaleString("th-TH") })
      : rider.commissionType === "percent_fee"
        ? t("commissionPercent", { value: rider.commissionValue })
        : t("commissionFull");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/shop/riders"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("backToRiders")}
      </Link>

      <div className="flex items-start gap-3">
        <RiderAvatar rider={rider} size={48} />
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">{rider.name}</h1>
          <p className="text-sm text-muted">
            {rider.phone} · {commission}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={rider.status === "invited" ? "warning" : "neutral"}>
              {rider.status === "invited" ? t("statusInvited") : t("statusApproved")}
            </Badge>
            <Badge tone={rider.active ? "success" : "neutral"}>
              {rider.active ? t("statusActive") : t("statusInactive")}
            </Badge>
            <Badge tone={rider.openJobs > 0 ? "warning" : "neutral"}>
              {t("openJobs", { count: rider.openJobs })}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="font-semibold text-foreground">{t("last30Title")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted">{t("colTrips")}</p>
            <p className="font-semibold text-foreground">{last30.trips}</p>
          </div>
          <div>
            <p className="text-muted">{t("colCommission")}</p>
            <p className="font-semibold text-foreground">{satangToBaht(last30.commissionSatang)}</p>
          </div>
          <div>
            <p className="text-muted">{t("cashToReturn")}</p>
            <p className="font-semibold text-foreground">{satangToBaht(last30.cashDueSatang)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-foreground">{t("recentTitle")}</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("noRecentDeliveries")}</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {recent.map((o) => {
              const cashDue = o.codCollected || (o.paymentMethod === "cash" && o.paymentStatus !== "paid");
              return (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">#{o.orderNo}</p>
                    <p className="text-xs text-muted">
                      {o.deliveredAt ? THB_TIME.format(new Date(o.deliveredAt)) : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-right">
                    <span className="text-foreground">{satangToBaht(o.totalSatang)}</span>
                    <span className="text-muted">
                      {t("commissionShort")} {satangToBaht(o.riderCommissionSatang ?? 0)}
                    </span>
                    {cashDue && <Badge tone="warning">{t("cashBadge")}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <p className="text-xs text-muted">{t("privacyNote")}</p>

      <RidersManager riders={[rider]} showAdd={false} detailLinks={false} />

      {rider.active && <RevokeRiderButton riderId={rider.id} />}
    </div>
  );
}
