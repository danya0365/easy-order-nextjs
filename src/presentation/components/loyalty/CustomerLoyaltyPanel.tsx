import Link from "next/link";
import { Gift, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type {
  CustomerStampCardView,
  LoyaltyPointsBalance,
  LoyaltyPointsReward,
} from "@/src/domain/entities";
import { CardBalance } from "@/src/presentation/components/loyalty/CardBalance";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";

export async function CustomerLoyaltyPanel({
  slug,
  bound,
  stampView,
  pointsBalance,
  pointsRewards,
  showStamp,
  showPoints,
}: {
  slug: string;
  bound: boolean;
  stampView: CustomerStampCardView | null;
  pointsBalance: LoyaltyPointsBalance | null;
  pointsRewards: LoyaltyPointsReward[];
  showStamp: boolean;
  showPoints: boolean;
}) {
  const t = await getTranslations("loyalty");
  if (!showStamp && !showPoints) return null;

  if (!bound) {
    return (
      <Card>
        <CardHeader title={t("customerTitle")} subtitle={t("bindCtaSubtitle")} />
        <p className="flex items-start gap-2 text-sm text-muted">
          <Smartphone className="mt-0.5 size-4 shrink-0" />
          {t("bindCtaBody")}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t("customerTitle")}
        subtitle={t("customerSubtitle")}
      />
      <div className="space-y-5">
        {showStamp && stampView && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-sm font-medium text-foreground">
              <Gift className="size-4" />
              {t("stampKind")}
            </p>
            <CardBalance types={stampView.types} compact />
          </div>
        )}
        {showPoints && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("pointsKind")}</p>
            <p className="text-2xl font-bold text-brand-600">
              {pointsBalance?.currentPoints ?? 0}
              <span className="ml-1 text-sm font-normal text-muted">
                {t("pointsUnit")}
              </span>
            </p>
            {pointsRewards.length > 0 && (
              <ul className="space-y-1 text-sm text-muted">
                {pointsRewards.map((r) => (
                  <li key={r.id}>
                    {r.name} — {t("pointsCost", { n: r.pointsCost })}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">{t("redeemAtCounter")}</p>
          </div>
        )}
        <Link
          href={`/s/${slug}`}
          className="sr-only"
        >
          {slug}
        </Link>
      </div>
    </Card>
  );
}
