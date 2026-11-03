import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";
import { shopCreditStatus } from "@/src/infrastructure/request/credit";
import { AppHeader } from "@/src/presentation/components/layout/AppHeader";
import { AppTabBar } from "@/src/presentation/components/layout/AppTabBar";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { ImpersonationBanner } from "@/src/presentation/components/admin/ImpersonationBanner";
import { PausedBanner } from "@/src/presentation/components/billing/PausedBanner";
import { GroupIntlProvider } from "@/src/i18n/GroupIntlProvider";
import { CreditHeaderBadge, CreditLowBanner } from "@/src/presentation/components/credit/CreditBalanceAlert";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One memoized bundle: vinext probes the layout before rendering it, so this
  // runs once per request instead of twice; independent reads run in parallel.
  const { user, impersonating, t, status, unread, shop, credit } =
    await requestMemo("layout:shop", async () => {
      const { user, shopId, impersonating } = await requireShopAccess();
      const [t, { status }, unread, shop, credit] = await Promise.all([
        getTranslations("shopPages"),
        getBillingState(shopId),
        // Impersonating admins have no shop-owner notifications of their own.
        impersonating ? Promise.resolve(0) : container.notificationRepository.countUnread(user.id),
        impersonating ? container.shopRepository.findById(shopId) : Promise.resolve(null),
        shopCreditStatus(shopId),
      ]);
      return { user, shopId, impersonating, t, status, unread, shop, credit };
    });

  return (
    <GroupIntlProvider group="shop">
    <div className="flex min-h-dvh flex-col">
      {impersonating && (
        <ImpersonationBanner shopName={shop?.name ?? "—"} />
      )}
      <AppHeader
        role={impersonating ? t("roleImpersonating") : t("roleShop")}
        userEmail={user.email}
        notifications={{ href: "/shop/notifications", unread }}
        extra={<CreditHeaderBadge status={credit} />}
      />
      <CreditLowBanner status={credit} />
      <PausedBanner status={status} resumable />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {children}
        <AppVersion />
      </main>
      <AppTabBar nav="shop" hideCreditNav={!credit.enabled} />
    </div>
    </GroupIntlProvider>
  );
}
