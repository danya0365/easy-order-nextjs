import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { ContactAdminButton } from "@/src/presentation/components/shop/ContactAdminButton";
import { FeatureCarousel } from "@/src/presentation/components/shop/FeatureCarousel";
import { FeatureGrid } from "@/src/presentation/components/shop/FeatureGrid";
import { OnboardingSuggestions } from "@/src/presentation/components/shop/OnboardingSuggestions";

export const dynamic = "force-dynamic";

export default async function ShopDashboardPage() {
  const { user, shopId, impersonating } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const [shop, { status }, activeOrders, menuItems, customers, branches, users] =
    await Promise.all([
      container.shopRepository.findById(shopId),
      getBillingState(shopId),
      container.orderRepository.listActiveByShop(shopId),
      container.menuItemRepository.listByShop(shopId),
      container.customerRepository.listByShop(shopId),
      container.branchRepository.listByShop(shopId),
      container.userRepository.listByShop(shopId),
    ]);

  const hasStaff = users.some((u) => u.role === "branch_staff");
  // Onboarding's LINE step reflects the real shop OWNER, not the acting admin —
  // so an impersonating admin sees the shop's true setup state, not their own.
  const owner = users.find((u) => u.role === "shop_owner");
  const lineLinked = impersonating ? !!owner?.lineUserId : !!user.lineUserId;

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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{shop?.name}</h1>
        <p className="mt-1 text-sm text-muted">{t("dashRemaining", { remaining })}</p>
      </div>

      <FeatureCarousel />
      <OnboardingSuggestions
        shopId={shopId}
        menuReady={menuItems.length > 0}
        kioskReady={!!shop?.hasKioskPin && !!shop?.promptpayTarget}
        lineLinked={lineLinked}
        hasStaff={hasStaff}
      />

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

      <FeatureGrid />

      <Card>
        <CardHeader title={t("needHelpTitle")} subtitle={t("needHelpSubtitle")} />
        <ContactAdminButton />
      </Card>
    </div>
  );
}
