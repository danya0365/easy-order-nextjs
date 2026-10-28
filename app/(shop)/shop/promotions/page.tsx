import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { PromotionsManager } from "@/src/presentation/components/promotions/PromotionsManager";

export const dynamic = "force-dynamic";

export default async function ShopPromotionsPage() {
  const { shopId } = await requireShopWrite();
  const t = await getTranslations("promotions");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) return null;
  if (!shop.promotionsAllowedByAdmin) {
    return (
      <main className="p-4">
        <p className="text-sm text-muted">{t("notAllowed")}</p>
      </main>
    );
  }
  if (!shop.promotionsEnabled) {
    return (
      <main className="mx-auto max-w-lg space-y-3 p-4 pb-24">
        <p className="text-sm text-muted">{t("moduleOffHint")}</p>
        <Link href="/shop/settings" className="text-sm text-brand-600 underline">
          {t("goSettings")}
        </Link>
      </main>
    );
  }
  const promotions = await container.shopPromotionRepository.listByShop(shopId);
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <Card>
        <CardHeader title={t("settingsTitle")} subtitle={t("manageHint")} />
        <PromotionsManager promotions={promotions} />
      </Card>
    </main>
  );
}
