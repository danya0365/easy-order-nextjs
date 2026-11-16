import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, FerrisWheel, History, Plus, ScanLine, TriangleAlert } from "lucide-react";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { isSpendPointsOn } from "@/src/domain/services/loyalty-gates";
import { eligiblePrizes, prizeOdds, bangkokDayKey } from "@/src/domain/services/lucky-wheel";
import type { SpinCampaign } from "@/src/domain/entities";
import { satangToBaht } from "@/src/presentation/lib/money";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { StatCard } from "@/src/presentation/components/ui/StatCard";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { PrizeIcon } from "@/src/presentation/components/wheel/LuckyWheel";
import { WheelCampaignForm } from "@/src/presentation/components/wheel/WheelCampaignForm";
import { wheelPrizeKind } from "@/src/presentation/components/wheel/RewardBits";

export const dynamic = "force-dynamic";

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export default async function ShopWheelPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { shopId } = await requireShopAccess();
  const range = (await searchParams).range === "all" ? "all" : "30";
  const since = range === "all" ? null : daysAgoISO(30);
  const repo = container.luckyWheelRepository;
  const [t, shop, settings, campaign, prizes, wins, report] = await Promise.all([
    getTranslations("wheel"),
    container.shopRepository.findById(shopId),
    container.platformSettingsRepository.get(),
    repo.getCampaign(shopId),
    repo.listPrizes(shopId),
    repo.winsOnDay(shopId, bangkokDayKey(new Date())),
    repo.report(shopId, since),
  ]);
  const now = new Date().toISOString();
  const c: SpinCampaign = campaign ?? {
    id: "",
    shopId,
    name: "หมุนวงล้อลุ้นรางวัล",
    isActive: false,
    minOrderSatang: 0,
    ticketsPerOrder: 1,
    monthlyFreeEnabled: false,
    monthlyWindowDays: 3,
    rewardExpiryDays: 30,
    rulesText: null,
    createdAt: now,
    updatedAt: now,
  };
  const pointsOn = !!shop && isSpendPointsOn(shop);
  const drawable = eligiblePrizes(prizes, { winsToday: wins, pointsOn });
  const odds = prizeOdds(drawable);
  const shownPrizes = prizes.filter((p) => p.type !== "coupon_amount" && p.type !== "coupon_percent");

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <FerrisWheel className="size-6" />
        </span>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{t("shopTitle")}</h1>
          <p className="text-sm text-muted">{t("shopSubtitle")}</p>
        </div>
      </div>

      {!settings.luckyWheelEnabled && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {t("platformOff")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link href="/shop/wheel/redeem" className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-semibold text-foreground hover:bg-muted-surface" data-testid="wheel-open-redeem">
          <ScanLine className="size-4 text-brand-600" />
          {t("redeemTitle")}
        </Link>
        <Link href="/shop/wheel/spins" className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-semibold text-foreground hover:bg-muted-surface" data-testid="wheel-open-spins">
          <History className="size-4 text-brand-600" />
          {t("viewSpins")}
        </Link>
      </div>

      <Card>
        <CardHeader
          title={t("prizesTitle", { count: shownPrizes.length })}
          action={
            shownPrizes.length < 12 ? (
              <Link href="/shop/wheel/prizes/new" className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-on-brand" data-testid="wheel-add-prize">
                <Plus className="size-3.5" />
                {t("addPrize")}
              </Link>
            ) : undefined
          }
        />
        {shownPrizes.length === 0 ? (
          <EmptyState title={t("noPrizesShop")} />
        ) : (
          <ul className="divide-y divide-border" data-testid="wheel-prize-list">
            {shownPrizes.map((p) => (
              <li key={p.id}>
                <Link href={`/shop/wheel/prizes/${p.id}`} className="flex items-center gap-3 py-3 hover:bg-muted-surface">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <PrizeIcon type={wheelPrizeKind(p.type)} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{p.name}</span>
                    <span className="block text-xs text-muted">
                      {p.stock === null ? t("prizeUnlimited") : t("prizeStock", { n: p.stock })}
                      {p.dailyCap !== null && ` · ${t("prizeDailyCap", { n: p.dailyCap })}`}
                      {p.costSatang > 0 && ` · ฿${satangToBaht(p.costSatang)}`}
                    </span>
                  </span>
                  {!p.isActive ? (
                    <Badge>{t("prizeInactive")}</Badge>
                  ) : p.stock === 0 ? (
                    <Badge tone="danger">{t("prizeOutOfStock")}</Badge>
                  ) : odds[p.id] !== undefined ? (
                    <Badge tone="brand">{t("prizeOdds", { pct: odds[p.id] })}</Badge>
                  ) : null}
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t("settingsTitle")} />
        <WheelCampaignForm campaign={c} />
      </Card>

      <Card data-testid="wheel-report">
        <CardHeader
          title={t("reportTitle")}
          action={
            <div className="flex gap-1 text-xs">
              <Link href="/shop/wheel" className={`rounded-full px-3 py-1 ${range === "30" ? "bg-brand-500 text-on-brand" : "bg-muted-surface text-muted"}`}>
                {t("range30")}
              </Link>
              <Link href="/shop/wheel?range=all" className={`rounded-full px-3 py-1 ${range === "all" ? "bg-brand-500 text-on-brand" : "bg-muted-surface text-muted"}`}>
                {t("rangeAll")}
              </Link>
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label={t("statSpins")} value={report.spins} />
          <StatCard label={t("statTickets")} value={report.ticketsIssued} hint={t("statTicketsAvail") + ` ${report.ticketsAvailable}`} />
          <StatCard label={t("statRedeemed")} value={report.rewardsRedeemed} hint={`${t("statPending")} ${report.rewardsPending}`} />
          <StatCard label={t("statCost")} value={`฿${satangToBaht(report.costSatang)}`} hint={`${t("statPoints")} ${report.pointsAwarded}`} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">{t("byPrizeTitle")}</h3>
        {report.byPrize.length === 0 ? (
          <p className="mt-1 text-sm text-muted">{t("noSpins")}</p>
        ) : (
          <ul className="mt-1 divide-y divide-border text-sm">
            {report.byPrize.map((b) => (
              <li key={b.prizeName + b.prizeType} className="flex items-center justify-between gap-2 py-2">
                <span className="inline-flex items-center gap-2 text-foreground">
                  <PrizeIcon type={wheelPrizeKind(b.prizeType)} className="size-4 text-brand-600" />
                  {b.prizeName}
                </span>
                <span className="text-xs text-muted">
                  {t("byPrizeRow", { wins: b.wins, redeemed: b.redeemed })}
                  {b.costSatang > 0 && ` · ฿${satangToBaht(b.costSatang)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
