import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { mainBranchOf } from "@/src/domain/services/branch-ordering";
import { pageParam, Pager } from "@/src/presentation/components/credit/CreditBits";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { AddBranchForm } from "@/src/presentation/components/shop/AddBranchForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopBranchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { shopId } = await requireShopAccess();
  const params = await searchParams;
  const page = pageParam(params.page);
  const t = await getTranslations("shopPages");
  const tb = await getTranslations("branch");

  const [{ items, total }, list] = await Promise.all([
    container.branchRepository.pageByShop(shopId, page, 10),
    container.branchRepository.listByShop(shopId),
  ]);
  const mainId = mainBranchOf(list)?.id ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("addBranchTitle")} />
        <AddBranchForm />
      </Card>

      <Card>
        <CardHeader title={t("allBranchesTitle", { count: total })} />
        {items.length === 0 ? (
          <EmptyState icon={<Building2 />} title={t("noBranches")} />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border">
              {items.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/shop/branches/${b.id}`}
                    data-testid="branch-row"
                    className="flex items-center gap-3 py-3 hover:bg-muted-surface/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{b.name}</span>
                        {b.id === mainId && <Badge tone="brand">{tb("mainBadge")}</Badge>}
                        {b.isActive ? (
                          b.acceptingOrders ? (
                            <Badge tone="success">{tb("statusOpen")}</Badge>
                          ) : (
                            <Badge tone="warning">{tb("statusClosed")}</Badge>
                          )
                        ) : (
                          <Badge tone="neutral">{tb("statusInactive")}</Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {b.address ?? tb("noLocation")}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            <Pager basePath="/shop/branches" page={page} total={total} pageSize={10} />
          </>
        )}
      </Card>
    </div>
  );
}
