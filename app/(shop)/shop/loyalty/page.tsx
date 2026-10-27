import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import {
  isLoyaltyEffective,
  isSpendPointsOn,
  isStampCardOn,
} from "@/src/domain/services/loyalty-gates";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { StampStation } from "@/src/presentation/components/loyalty/StampStation";
import { PointsStaffPanel } from "@/src/presentation/components/loyalty/PointsStaffPanel";

export const dynamic = "force-dynamic";

export default async function ShopLoyaltyStationPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("loyalty");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) return null;

  if (!isLoyaltyEffective(shop)) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <h1 className="text-xl font-bold text-foreground">{t("stationTitle")}</h1>
        <p className="text-sm text-muted">{t("moduleOffHint")}</p>
        <Link href="/shop/settings" className="text-sm text-brand-600 underline">
          {t("goSettings")}
        </Link>
      </main>
    );
  }

  const [types, rewards] = await Promise.all([
    isStampCardOn(shop)
      ? container.loyaltyStampTypeRepository.listByShop(shopId)
      : Promise.resolve([]),
    isSpendPointsOn(shop)
      ? container.loyaltyPointsRewardRepository.listByShop(shopId, {
          activeOnly: true,
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-lg space-y-6 p-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("stationTitle")}</h1>
        <p className="text-sm text-muted">{t("stationSubtitle")}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link href="/shop/loyalty/stamps" className="text-brand-600 underline">
            {t("manageStamps")}
          </Link>
          <Link href="/shop/loyalty/points" className="text-brand-600 underline">
            {t("managePoints")}
          </Link>
        </div>
      </div>

      {isStampCardOn(shop) && (
        <Card>
          <CardHeader title={t("stampKind")} subtitle={t("stampStationHint")} />
          <StampStation types={types} />
        </Card>
      )}

      {isSpendPointsOn(shop) && (
        <Card>
          <CardHeader title={t("pointsKind")} subtitle={t("pointsStationHint")} />
          <PointsStaffPanel rewards={rewards} />
        </Card>
      )}
    </main>
  );
}
