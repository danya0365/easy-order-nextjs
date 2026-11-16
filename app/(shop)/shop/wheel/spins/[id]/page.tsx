import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { satangToBaht } from "@/src/presentation/lib/money";
import { Card } from "@/src/presentation/components/ui/Card";
import { PrizeIcon } from "@/src/presentation/components/wheel/LuckyWheel";
import { RedeemRewardButton } from "@/src/presentation/components/wheel/RedeemRewardButton";
import { RewardStatusBadge, rewardState, wheelPrizeKind } from "@/src/presentation/components/wheel/RewardBits";

export const dynamic = "force-dynamic";

export default async function ShopWheelSpinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId } = await requireShopAccess();
  const r = await container.luckyWheelRepository.findResult(shopId, id);
  if (!r) notFound();
  const [t, customer, redeemer, branch] = await Promise.all([
    getTranslations("wheel"),
    container.customerRepository.findById(shopId, r.customerId),
    r.redeemedBy ? container.userRepository.findById(r.redeemedBy) : Promise.resolve(null),
    r.redeemedBranchId ? container.branchRepository.findById(r.redeemedBranchId) : Promise.resolve(null),
  ]);
  const state = rewardState(r);
  const rows: [string, React.ReactNode][] = [
    [t("customerLabel"), customer ? <Link href={`/shop/customers/${customer.id}`} className="font-semibold text-brand-600">{customer.displayName || customer.phone}</Link> : "-"],
    [t("wonAt", { date: "" }).trim(), formatDateTime(r.createdAt)],
  ];
  if (r.rewardCode) rows.push([t("rewardCode"), <span key="c" className="font-mono font-bold tracking-widest">{r.rewardCode}</span>]);
  if (r.pointsAwarded > 0) rows.push([t("statPoints"), String(r.pointsAwarded)]);
  if (r.costSatang > 0) rows.push([t("statCost"), `฿${satangToBaht(r.costSatang)}`]);
  if (r.expiresAt) rows.push([t("expiresAt", { date: "" }).trim(), formatDateTime(r.expiresAt)]);
  if (r.redeemedAt) rows.push([t("redeemedAt", { date: "" }).trim(), formatDateTime(r.redeemedAt)]);
  if (redeemer) rows.push([t("redeemedBy"), redeemer.email]);
  if (branch) rows.push([t("redeemedBranch"), branch.name]);

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-24">
      <Link href="/shop/wheel/spins" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowLeft className="size-4" />
        {t("spinsTitle")}
      </Link>
      <Card data-testid="wheel-spin-detail">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <PrizeIcon type={wheelPrizeKind(r.prizeType)} className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-xs text-muted">{t("detailTitle")}</p>
            <h1 className="text-lg font-bold text-foreground">{r.prizeName}</h1>
          </div>
          <RewardStatusBadge result={r} />
        </div>
        <dl className="mt-4 divide-y divide-border text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        {state === "pending" && (
          <div className="mt-4">
            <RedeemRewardButton resultId={r.id} />
          </div>
        )}
      </Card>
    </main>
  );
}
