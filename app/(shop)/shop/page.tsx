import Link from "next/link";
import { ClipboardList, Settings, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { ContactAdminButton } from "@/src/presentation/components/shop/ContactAdminButton";

export const dynamic = "force-dynamic";

export default async function ShopDashboardPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const [shop, { status }, activeOrders, menuItems, customers, branches] =
    await Promise.all([
      container.shopRepository.findById(shopId),
      getBillingState(shopId),
      container.orderRepository.listActiveByShop(shopId),
      container.menuItemRepository.listByShop(shopId),
      container.customerRepository.listByShop(shopId),
      container.branchRepository.listByShop(shopId),
    ]);

  const stats = [
    { href: "/shop/orders", label: t("statActiveOrders"), value: activeOrders.length, accent: true },
    { href: "/shop/menu", label: t("statMenuItems"), value: menuItems.length },
    { href: "/shop/customers", label: t("statCustomers"), value: customers.length },
    { href: "/shop/branches", label: t("statBranches"), value: branches.length },
  ];

  const remaining =
    status.state === "active"
      ? t("remainingDays", { days: status.daysUntilDue })
      : status.isSuspended
        ? t("statusSuspended")
        : t("overdueTopup", { days: status.graceDaysLeft });

  const links = [
    { href: "/shop/orders", label: t("quickOrders"), icon: ClipboardList },
    { href: "/shop/menu", label: t("quickMenu"), icon: UtensilsCrossed },
    { href: "/shop/settings", label: t("quickSettings"), icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{shop?.name}</h1>
        <p className="mt-1 text-sm text-muted">{t("dashRemaining", { remaining })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ href, label, value, accent }) => (
          <Link key={href} href={href}>
            <Card className="flex flex-col gap-1">
              <span
                className={
                  accent
                    ? "text-2xl font-bold text-accent-500"
                    : "text-2xl font-bold text-brand-600"
                }
              >
                {value}
              </span>
              <span className="text-sm text-muted">{label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-foreground transition hover:bg-muted-surface"
          >
            <Icon className="size-5 text-brand-600" />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title={t("needHelpTitle")} subtitle={t("needHelpSubtitle")} />
        <ContactAdminButton />
      </Card>
    </div>
  );
}
