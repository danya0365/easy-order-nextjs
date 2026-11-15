import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { orderQueueScope } from "@/src/infrastructure/auth/order-queue-scope";
import { loadOrderQueue } from "@/src/presentation/lib/order-queue-data";
import { OrderQueue } from "@/src/presentation/components/order/OrderQueue";
import { BranchFilterChips } from "@/src/presentation/components/order/BranchFilterChips";

export const dynamic = "force-dynamic";

export default async function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  await requireShopAccess();
  const { branch } = await searchParams;
  const t = await getTranslations("order");
  const tb = await getTranslations("branch");
  const scope = await orderQueueScope();
  const q = await loadOrderQueue(scope, branch ?? null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("queueTitle")}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("queueSubtitle")}</p>
      </div>
      <BranchFilterChips
        basePath="/shop/orders"
        branches={scope.branches.map((b) => ({ id: b.id, name: b.name }))}
        selected={q.selectedBranchId}
        allLabel={tb("allBranches")}
      />
      <OrderQueue
        key={q.selectedBranchId ?? "all"}
        activeOrders={q.active}
        historyInitial={q.hist}
        historyCursor={q.historyCursor}
        riders={q.riders}
        branchNames={q.branchNames}
        mainBranchId={scope.mainBranchId}
        historyBranch={q.selectedBranchId}
      />
    </div>
  );
}
