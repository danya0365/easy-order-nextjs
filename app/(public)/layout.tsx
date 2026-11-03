import { CustomerTabBar } from "@/src/presentation/components/layout/CustomerTabBar";
import { PublicSiteHeader } from "@/src/presentation/components/layout/PublicSiteHeader";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { GroupIntlProvider } from "@/src/i18n/GroupIntlProvider";

/**
 * Platform customer shell (map, shops directory, my history, tutorial, about).
 * Per-shop PWAs live under `(shop-customer)/s/[slug]` with their own ShopTabBar.
 * Padding-bottom reserves space so the fixed bar never covers page content
 * (incl. the iOS safe-area inset).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GroupIntlProvider group="public">
    <div className="pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <PublicSiteHeader />
      {children}
      <AppVersion />
      <CustomerTabBar />
    </div>
    </GroupIntlProvider>
  );
}
