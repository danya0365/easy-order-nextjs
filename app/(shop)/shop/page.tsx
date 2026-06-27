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
  const [shop, { status }] = await Promise.all([
    container.shopRepository.findById(shopId),
    getBillingState(shopId),
  ]);

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
