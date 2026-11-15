import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { mainBranchOf } from "@/src/domain/services/branch-ordering";
import { startOfBangkokDayISO } from "@/src/application/use-cases/rider/RiderUseCases";
import { buildBranchOrderQr } from "@/src/infrastructure/request/order-qr";
import { satangToBaht } from "@/src/presentation/lib/money";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { ToggleActiveButton } from "@/src/presentation/components/shop/ToggleActiveButton";
import { BranchAcceptingToggle } from "@/src/presentation/components/shop/BranchAcceptingToggle";
import { BranchLocationEditor } from "@/src/presentation/components/map/BranchLocationEditor";
import { OrderAccessQrCard } from "@/src/presentation/components/shop/OrderAccessQrCard";
import { BranchSoldOutList } from "@/src/presentation/components/shop/BranchSoldOutList";
import { pageParam, Pager } from "@/src/presentation/components/credit/CreditBits";

export const dynamic = "force-dynamic";

const SOLD_OUT_PAGE_SIZE = 20;

export default async function ShopBranchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const menuPage = pageParam((await searchParams).page);
  const { shopId } = await requireShopAccess();
  const branch = await container.branchRepository.findById(id);
  if (!branch || branch.shopId !== shopId) notFound();

  const [t, list, shop, users, items, soldIds] = await Promise.all([
    getTranslations("branch"),
    container.branchRepository.listByShop(shopId),
    container.shopRepository.findById(shopId),
    container.userRepository.listByShop(shopId),
    container.menuItemRepository.listByShop(shopId),
    container.branchRepository.listSoldOutItemIds(branch.id),
  ]);
  const mainId = mainBranchOf(list)?.id ?? null;
  const isMain = branch.id === mainId;
  const [summary, qr] = await Promise.all([
    container.analyticsRepository.summary(
      shopId,
      startOfBangkokDayISO(new Date()),
      { branchId: branch.id, includeUnassigned: isMain },
    ),
    shop ? buildBranchOrderQr(shop, branch.id) : Promise.resolve(null),
  ]);
  // Sold-out list is paginated (menus can be long); state uses the full id list.
  const menuPageItems = items.slice(
    (menuPage - 1) * SOLD_OUT_PAGE_SIZE,
    menuPage * SOLD_OUT_PAGE_SIZE,
  );
  const soldHere = soldIds.filter((sid) => items.some((i) => i.id === sid)).length;
  const staff = users.filter(
    (u) => u.role === "branch_staff" && u.branchId === branch.id,
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/shop/branches"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-foreground">{branch.name}</h1>
        {isMain && <Badge tone="brand">{t("mainBadge")}</Badge>}
      </div>

      <Card>
        <CardHeader title={t("todayTitle")} />
        <div data-testid="branch-today" className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted-surface px-4 py-3">
              <p className="text-xs text-muted">{t("todayOrders")}</p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {summary.orders}
              </p>
            </div>
            <div className="rounded-xl bg-muted-surface px-4 py-3">
              <p className="text-xs text-muted">{t("todaySales")}</p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                ฿{satangToBaht(summary.revenueSatang)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              href={`/shop/orders?branch=${branch.id}`}
              className="text-brand-700 hover:underline"
            >
              {t("viewQueue")}
            </Link>
            <Link
              href={`/shop/analytics?branch=${branch.id}`}
              className="text-brand-700 hover:underline"
            >
              {t("viewBranchReport")}
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("statusTitle")} />
        <div className="flex flex-col gap-4">
          {branch.isActive ? (
            <BranchAcceptingToggle
              branchId={branch.id}
              acceptingOrders={branch.acceptingOrders}
            />
          ) : (
            <p className="text-sm text-muted">{t("inactiveHint")}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <ToggleActiveButton kind="branch" id={branch.id} isActive={branch.isActive} />
            <span className="text-xs text-muted">{t("activeHint")}</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("qrTitle")} />
        <div data-testid="branch-qr">
          {qr && shop ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">{t("qrHint")}</p>
              <OrderAccessQrCard
                qrDataUrl={qr.qrDataUrl}
                shopName={`${shop.name} — ${branch.name}`}
              />
            </div>
          ) : (
            <Link href="/shop/settings" className="text-sm font-semibold text-brand-700 hover:underline">
              {t("qrOff")}
            </Link>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("staffTitle")} />
        <div data-testid="branch-staff" className="flex flex-col gap-3">
          {staff.length === 0 ? (
            <p className="text-sm text-muted">{t("noStaff")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {staff.map((u) => (
                <li key={u.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="text-foreground">{u.email}</span>
                  {!u.isActive && (
                    <Badge tone="neutral">{t("staffInactive")}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href="/shop/staff" className="text-sm text-brand-700 hover:underline">
            {t("manageStaff")}
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("locationTitle")} />
        <BranchLocationEditor
          branchId={branch.id}
          latitude={branch.latitude}
          longitude={branch.longitude}
          address={branch.address}
        />
      </Card>

      <Card>
        <CardHeader title={t("soldOutTitle")} />
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t("soldOutHint")}</p>
          {soldHere > 0 && (
            <p className="text-sm font-medium text-warning" data-testid="branch-soldout-count">
              {t("soldOutCount", { count: soldHere })}
            </p>
          )}
          <BranchSoldOutList
            branchId={branch.id}
            items={menuPageItems.map((i) => ({
              id: i.id,
              name: i.name,
              globallyAvailable: i.isAvailable,
            }))}
            soldOutIds={soldIds}
          />
          <Pager
            basePath={`/shop/branches/${branch.id}`}
            page={menuPage}
            total={items.length}
            pageSize={SOLD_OUT_PAGE_SIZE}
          />
        </div>
      </Card>
    </div>
  );
}
