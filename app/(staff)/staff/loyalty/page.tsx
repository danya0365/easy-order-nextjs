import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
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

export default async function StaffLoyaltyPage() {
  const user = await requireRole("branch_staff");
  const t = await getTranslations("loyalty");
  const shopId = user.shopId!;
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) return null;

  if (!isLoyaltyEffective(shop)) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <h1 className="text-xl font-bold text-foreground">{t("stationTitle")}</h1>
        <p className="text-sm text-muted">{t("moduleOffHint")}</p>
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
