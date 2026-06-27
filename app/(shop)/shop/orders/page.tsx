import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { OrderQueue } from "@/src/presentation/components/order/OrderQueue";

export const dynamic = "force-dynamic";

export default async function ShopOrdersPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("order");
  const [activeOrders, history] = await Promise.all([
    container.orderRepository.listActiveByShop(shopId),
    container.orderRepository.pageHistoryByShop(shopId, {}),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("queueTitle")}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("queueSubtitle")}</p>
      </div>
      <OrderQueue
        activeOrders={activeOrders}
        historyInitial={history.items}
        historyCursor={history.nextCursor}
      />
    </div>
  );
}
