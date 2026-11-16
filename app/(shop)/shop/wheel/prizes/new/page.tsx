import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { isSpendPointsOn } from "@/src/domain/services/loyalty-gates";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { WheelPrizeForm } from "@/src/presentation/components/wheel/WheelPrizeForm";

export const dynamic = "force-dynamic";

export default async function NewWheelPrizePage() {
  const { shopId } = await requireShopAccess();
  const [t, shop, items] = await Promise.all([
    getTranslations("wheel"),
    container.shopRepository.findById(shopId),
    container.menuItemRepository.listByShop(shopId),
  ]);
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-24">
      <Link href="/shop/wheel" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowLeft className="size-4" />
        {t("backToWheel")}
      </Link>
      <Card>
        <CardHeader title={t("newPrize")} />
        <WheelPrizeForm prize={null} menuItems={items.map((i) => ({ id: i.id, name: i.name }))} pointsOn={!!shop && isSpendPointsOn(shop)} />
      </Card>
    </main>
  );
}
