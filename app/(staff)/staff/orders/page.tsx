import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";

import { requireRole } from "@/src/infrastructure/auth/session";
import { orderQueueScope } from "@/src/infrastructure/auth/order-queue-scope";
import { loadOrderQueue } from "@/src/presentation/lib/order-queue-data";
import { OrderQueue } from "@/src/presentation/components/order/OrderQueue";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";

export const dynamic = "force-dynamic";

/** Branch staff order queue: ONLY this staff member's branch (server-pinned). */
export default async function StaffOrdersPage() {
  await requireRole("branch_staff");
  const t = await getTranslations("order");
  const tb = await getTranslations("branch");

  let scope;
  try {
    scope = await orderQueueScope();
  } catch (e) {
    return <EmptyState title={tb("staffQueueUnavailable")} description={(e as Error).message} />;
  }
  const q = await loadOrderQueue(scope);
  const branch = scope.branches.find((b) => b.id === scope.staffBranchId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("queueTitle")}</h1>
        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-medium text-brand-700" data-testid="staff-branch">
          <MapPin className="size-4" />
          {tb("staffQueueBranch", { name: branch?.name ?? "" })}
        </p>
      </div>
      <OrderQueue
        activeOrders={q.active}
        historyInitial={q.hist}
        historyCursor={q.historyCursor}
        riders={q.riders}
        staffMode
        canCancel={scope.canCancel}
      />
    </div>
  );
}
