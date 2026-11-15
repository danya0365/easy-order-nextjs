import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { KioskControl } from "@/src/presentation/components/kiosk/KioskControl";

export const dynamic = "force-dynamic";

export default async function ShopKioskPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const [shop, branches, tb] = await Promise.all([
    container.shopRepository.findById(shopId),
    container.branchRepository.listByShop(shopId),
    getTranslations("branch"),
  ]);
  if (!shop) return null;
  // Kiosk can only be bound to an active branch; note closed-for-orders ones.
  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name, note: b.acceptingOrders ? null : tb("statusClosed") }));

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Card>
        <CardHeader title={t("kioskTitle")} subtitle={t("kioskSubtitle")} />
        <KioskControl
          hasKioskPin={shop.hasKioskPin}
          selfService={shop.selfService}
          branches={branchOptions}
        />
      </Card>
    </div>
  );
}
