import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarClock, Gift, Info, ListChecks, Percent, ShoppingBag, Smartphone, Ticket } from "lucide-react";

import { prizeOdds, inMonthlyWindow } from "@/src/domain/services/lucky-wheel";
import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";
import { currentWheelMember, wheelService } from "@/src/presentation/lib/lucky-wheel";
import { satangToBaht } from "@/src/presentation/lib/money";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { LuckyWheel, PrizeIcon, type WheelSegment } from "@/src/presentation/components/wheel/LuckyWheel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shop = await shopBySlug(slug);
  const t = await getTranslations("wheel");
  return {
    title: shop ? `${t("title")} · ${shop.name}` : t("title"),
    manifest: shop ? `/s/${slug}/site.webmanifest` : undefined,
  };
}

export default async function ShopWheelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await shopBySlug(slug);
  if (!shop) notFound();
  const t = await getTranslations("wheel");
  const svc = wheelService();
  const gate = await svc.gate(shop.id);

  if (!gate.enabled || !gate.campaign) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
        <EmptyState icon={<Gift className="size-8" />} title={t("offTitle")} description={t("offDesc")} />
      </main>
    );
  }
  const campaign = gate.campaign;
  const member = await currentWheelMember(slug, shop.id);
  if (member && campaign.monthlyFreeEnabled) {
    await svc.ensureMonthlyTicket(shop.id, member.id);
  }
  const [prizes, tickets] = await Promise.all([
    svc.drawablePrizes(shop.id, shop),
    member ? svc.ticketCount(shop.id, member.id) : Promise.resolve(0),
  ]);
  const odds = prizeOdds(prizes);
  const segments: WheelSegment[] = prizes.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type === "points" || p.type === "free_item" || p.type === "gift" ? p.type : "thanks",
  }));
  if (segments.length === 0) segments.push({ id: "thanks", name: t("typeThanks"), type: "thanks" });
  const rewardsHref = `/s/${slug}/wheel/rewards`;
  const monthlyNow = campaign.monthlyFreeEnabled && inMonthlyWindow(new Date(), campaign.monthlyWindowDays);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
        <p className="mt-1 text-sm text-muted">{shop.name}</p>
      </header>

      {member ? (
        <LuckyWheel slug={slug} segments={segments} tickets={tickets} rewardsHref={rewardsHref} />
      ) : (
        <Card>
          <CardHeader title={t("memberTitle")} subtitle={t("memberDesc")} />
          <div className="mt-2 flex flex-col gap-2">
            <Link
              href={`/s/${slug}/orders`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted-surface"
            >
              <Smartphone className="size-4" />
              {t("memberCta")}
            </Link>
            <Link
              href={`/s/${slug}/order`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-600"
            >
              <ShoppingBag className="size-4" />
              {t("orderCta")}
            </Link>
          </div>
        </Card>
      )}

      {member && (
        <Link
          href={rewardsHref}
          data-testid="wheel-my-rewards"
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted-surface"
        >
          <Gift className="size-4" />
          {t("myRewards")}
        </Link>
      )}

      <Card>
        <CardHeader title={t("oddsTitle")} subtitle={t("oddsNote")} />
        {prizes.length === 0 ? (
          <p className="text-sm text-muted">{t("noPrizes")}</p>
        ) : (
          <ul className="divide-y divide-border" data-testid="wheel-odds">
            {prizes.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <PrizeIcon
                  type={p.type === "points" || p.type === "free_item" || p.type === "gift" ? p.type : "thanks"}
                  className="size-4 shrink-0 text-brand-600"
                />
                <span className="flex-1 text-foreground">
                  {p.name}
                  {p.stock !== null && <span className="ml-1 text-xs text-muted">({t("oddsStock", { n: p.stock })})</span>}
                </span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                  {odds[p.id]}
                  <Percent className="size-3" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t("howToEarn")} />
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <Ticket className="mt-0.5 size-4 shrink-0 text-brand-600" />
            {campaign.minOrderSatang > 0
              ? t("earnOrder", { min: `฿${satangToBaht(campaign.minOrderSatang)}`, count: campaign.ticketsPerOrder })
              : t("earnOrderAny", { count: campaign.ticketsPerOrder })}
          </li>
          <li className="flex gap-2">
            <ListChecks className="mt-0.5 size-4 shrink-0 text-brand-600" />
            {t("earnKiosk")}
          </li>
          {campaign.monthlyFreeEnabled && (
            <li className={`flex gap-2 ${monthlyNow ? "font-semibold text-brand-700" : ""}`}>
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-600" />
              {t("earnMonthly", { days: campaign.monthlyWindowDays })}
            </li>
          )}
          <li className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
            {t("earnCancel")}
          </li>
          <li className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
            {t("rewardExpiry", { days: campaign.rewardExpiryDays })}
          </li>
        </ul>
        {campaign.rulesText && (
          <div className="mt-3 rounded-xl bg-muted-surface p-3">
            <p className="text-xs font-semibold text-foreground">{t("rulesTitle")}</p>
            <p className="mt-1 whitespace-pre-line text-xs text-muted">{campaign.rulesText}</p>
          </div>
        )}
      </Card>
    </main>
  );
}
