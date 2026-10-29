import { Search, Users, UserCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Input } from "@/src/presentation/components/ui/Input";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { CustomerRowActions } from "@/src/presentation/components/shop/CustomerRowActions";
import { PendingMemberActions } from "@/src/presentation/components/shop/PendingMemberActions";
import { formatDateTime } from "@/src/presentation/lib/format-date";

export const dynamic = "force-dynamic";

export default async function ShopCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const tShop = await getTranslations("shop");

  const [page, pendingMembers] = await Promise.all([
    container.customerRepository.pageByShop(shopId, {
      search: q?.trim() || undefined,
      limit: 100,
    }),
    container.customerRepository.listPendingOnlineOrder(shopId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {pendingMembers.length > 0 ? (
        <Card>
          <CardHeader
            title={t("pendingMembersTitle")}
            subtitle={t("pendingMembersSubtitle")}
          />
          <ul className="flex flex-col divide-y divide-border">
            {pendingMembers.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium text-foreground">
                    <UserCheck className="size-4 shrink-0 text-brand-500" />
                    {c.displayName || tShop("custNoName")}
                  </p>
                  <p className="text-sm text-muted">{c.phone}</p>
                  {c.onlineOrderRequestedAt ? (
                    <p className="text-xs text-muted">
                      {t("pendingRequestedAt", {
                        date: formatDateTime(c.onlineOrderRequestedAt),
                      })}
                    </p>
                  ) : null}
                </div>
                <PendingMemberActions customerId={c.id} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={t("customersTitle")}
          subtitle={t("customersSubtitle")}
        />
        <form method="get" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            inputMode="tel"
            className="pl-9"
            placeholder={tShop("custSearchPlaceholder")}
          />
        </form>
      </Card>

      <Card>
        {page.items.length === 0 ? (
          <EmptyState icon={<Users />} title={tShop("custNone")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {page.items.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {c.displayName || tShop("custNoName")}
                  </p>
                  <p className="text-sm text-muted">{c.phone}</p>
                  <p className="text-xs text-muted">
                    {tShop("custJoined", { date: formatDateTime(c.createdAt) })}
                    {c.onlineOrderStatus !== "none"
                      ? ` · ${c.onlineOrderStatus}`
                      : ""}
                  </p>
                </div>
                <CustomerRowActions customerId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
