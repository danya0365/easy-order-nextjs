import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { withCustomerNotes } from "@/src/presentation/lib/order-notes";
import { ListRidersWithLoadUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { OrderQueue } from "@/src/presentation/components/order/OrderQueue";

export const dynamic = "force-dynamic";

export default async function ShopOrdersPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("order");
  const [activeOrders, history, riders] = await Promise.all([
    container.orderRepository.listActiveByShop(shopId),
    container.orderRepository.pageHistoryByShop(shopId, {}),
    new ListRidersWithLoadUseCase(container.riderRepository, container.orderRepository).execute(shopId),
  ]);
  const [active, hist] = await Promise.all([
    withCustomerNotes(shopId, activeOrders),
    withCustomerNotes(shopId, history.items),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("queueTitle")}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("queueSubtitle")}</p>
      </div>
      <OrderQueue
        activeOrders={active}
        historyInitial={hist}
        historyCursor={history.nextCursor}
        riders={riders
          .filter((r) => r.active)
          .map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            lineId: r.lineId,
            available: r.available,
            openJobs: r.openJobs,
          }))}
      />
    </div>
  );
}
