import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";
import { container } from "@/src/infrastructure/di/container";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { currentWheelMember } from "@/src/presentation/lib/lucky-wheel";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { Card } from "@/src/presentation/components/ui/Card";
import { PrizeIcon } from "@/src/presentation/components/wheel/LuckyWheel";
import { RewardStatusBadge, rewardState, wheelPrizeKind } from "@/src/presentation/components/wheel/RewardBits";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wheel");
  return { title: t("rewardsTitle") };
}

export default async function WheelRewardDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const shop = await shopBySlug(slug);
  if (!shop) notFound();
  const member = await currentWheelMember(slug, shop.id);
  if (!member) notFound();
  const r = await container.luckyWheelRepository.findResult(shop.id, id);
  if (!r || r.customerId !== member.id) notFound();
  const t = await getTranslations("wheel");
  const state = rewardState(r);
  const qr =
    state === "pending" && r.rewardCode
      ? await renderQrDataUrl(`${await getBaseUrl()}/wheel-redeem?shop=${encodeURIComponent(shop.id)}&code=${r.rewardCode}`)
      : null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <Link href={`/s/${slug}/wheel/rewards`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowLeft className="size-4" />
        {t("backToRewards")}
      </Link>
      <Card>
        <div className="flex flex-col items-center gap-3 text-center" data-testid="wheel-reward-detail">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <PrizeIcon type={wheelPrizeKind(r.prizeType)} className="size-7" />
          </span>
          <h1 className="text-xl font-bold text-foreground">{r.prizeName}</h1>
          <RewardStatusBadge result={r} />
          {qr && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR */}
              <img src={qr} alt={t("rewardCode")} className="size-56 rounded-xl border border-border bg-card p-2" />
              <p className="text-xs text-muted">{t("showToStaff")}</p>
            </>
          )}
          {r.rewardCode && (
            <div>
              <p className="text-xs text-muted">{t("rewardCode")}</p>
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-foreground" data-testid="wheel-reward-code">
                {r.rewardCode}
              </p>
            </div>
          )}
          <div className="space-y-1 text-sm text-muted">
            <p>{t("wonAt", { date: formatDateTime(r.createdAt) })}</p>
            {r.expiresAt && state !== "redeemed" && <p>{t("expiresAt", { date: formatDateTime(r.expiresAt) })}</p>}
            {r.redeemedAt && <p>{t("redeemedAt", { date: formatDateTime(r.redeemedAt) })}</p>}
            {r.prizeType === "points" && <p>{t("resultPoints")}</p>}
          </div>
        </div>
      </Card>
    </main>
  );
}
