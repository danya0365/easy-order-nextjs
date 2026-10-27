import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { PointsRewardsManager } from "@/src/presentation/components/loyalty/PointsRewardsManager";

export const dynamic = "force-dynamic";

export default async function ShopLoyaltyPointsPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("loyalty");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) return null;
  if (!shop.loyaltyAllowedByAdmin) {
    return (
      <main className="p-4">
        <p className="text-sm text-muted">{t("notAllowed")}</p>
      </main>
    );
  }
  const [settings, rewards] = await Promise.all([
    container.loyaltyPointsSettingsRepository.getOrCreate(shopId),
    container.loyaltyPointsRewardRepository.listByShop(shopId),
  ]);
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <Link href="/shop/loyalty" className="text-sm text-brand-600 underline">
        {t("backStation")}
      </Link>
      <Card>
        <CardHeader title={t("managePoints")} subtitle={t("managePointsHint")} />
        <PointsRewardsManager settings={settings} rewards={rewards} />
      </Card>
    </main>
  );
}
