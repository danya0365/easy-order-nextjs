import Link from "next/link";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  Megaphone,
  MonitorSmartphone,
  Settings,
  Star,
  UserCog,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardHeader } from "@/src/presentation/components/ui/Card";

type Feature = {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
};

/**
 * Full catalog of owner features as a discoverable tile grid — nothing buried in
 * the bottom-bar "more" overflow. Each tile links straight to the feature.
 * Async server component, so it uses the `shop` namespace at no client cost.
 */
export async function FeatureGrid() {
  const t = await getTranslations("shop");
  const FEATURES: Feature[] = [
    { id: "orders", icon: ClipboardList, label: t("featOrdersLabel"), description: t("featOrdersDesc"), href: "/shop/orders" },
    { id: "menu", icon: UtensilsCrossed, label: t("featMenuLabel"), description: t("featMenuDesc"), href: "/shop/menu" },
    { id: "customers", icon: Users, label: t("featCustomersLabel"), description: t("featCustomersDesc"), href: "/shop/customers" },
    { id: "analytics", icon: BarChart3, label: t("featAnalyticsLabel"), description: t("featAnalyticsDesc"), href: "/shop/analytics" },
    { id: "promote", icon: Megaphone, label: t("featPromoteLabel"), description: t("featPromoteDesc"), href: "/shop/promote" },
    { id: "reviews", icon: Star, label: t("featReviewsLabel"), description: t("featReviewsDesc"), href: "/shop/reviews" },
    { id: "branches", icon: Building2, label: t("featBranchesLabel"), description: t("featBranchesDesc"), href: "/shop/branches" },
    { id: "staff", icon: UserCog, label: t("featStaffLabel"), description: t("featStaffDesc"), href: "/shop/staff" },
    { id: "kiosk", icon: MonitorSmartphone, label: t("featKioskLabel"), description: t("featKioskDesc"), href: "/shop/settings" },
    { id: "notifications", icon: Bell, label: t("featNotificationsLabel"), description: t("featNotificationsDesc"), href: "/shop/notifications" },
    { id: "billing", icon: CreditCard, label: t("featBillingLabel"), description: t("featBillingDesc"), href: "/shop/billing" },
    { id: "settings", icon: Settings, label: t("featSettingsLabel"), description: t("featSettingsDesc"), href: "/shop/settings" },
  ];

  return (
    <Card>
      <CardHeader title={t("featuresTitle")} subtitle={t("featuresSubtitle")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.id}
              href={f.href}
              className="group flex flex-col gap-2 rounded-xl p-3 ring-1 ring-border transition hover:bg-muted-surface hover:ring-brand-300"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-brand-100 text-brand-700">
                <Icon className="size-5" />
              </span>
              <span className="block text-sm font-medium text-foreground">
                {f.label}
              </span>
              <span className="block text-xs text-muted">{f.description}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
