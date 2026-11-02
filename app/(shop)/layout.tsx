import Link from "next/link";
import { Wallet } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { container } from "@/src/infrastructure/di/container";
import { requestMemo } from "@/src/infrastructure/request/request-memo";
import { AppHeader } from "@/src/presentation/components/layout/AppHeader";
import { AppTabBar } from "@/src/presentation/components/layout/AppTabBar";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { ImpersonationBanner } from "@/src/presentation/components/admin/ImpersonationBanner";
import { SuspensionBanner } from "@/src/presentation/components/billing/SuspensionBanner";
import { PreExpiryBanner } from "@/src/presentation/components/billing/PreExpiryBanner";
import { satangToBaht } from "@/src/presentation/lib/money";
import { PausedBanner } from "@/src/presentation/components/billing/PausedBanner";
import { GroupIntlProvider } from "@/src/i18n/GroupIntlProvider";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One memoized bundle: vinext probes the layout before rendering it, so this
  // runs once per request instead of twice; independent reads run in parallel.
  const { user, impersonating, t, status, billingUiEnabled, pathname, unread, outstandingSatang, shop } =
    await requestMemo("layout:shop", async () => {
      const { user, shopId, impersonating } = await requireShopAccess();
      const [t, { status, billingUiEnabled }, h, unread, shop] = await Promise.all([
        getTranslations("shopPages"),
        getBillingState(shopId),
        headers(),
        // Impersonating admins have no shop-owner notifications of their own.
        impersonating ? Promise.resolve(0) : container.notificationRepository.countUnread(user.id),
        impersonating ? container.shopRepository.findById(shopId) : Promise.resolve(null),
      ]);
      // Daily-fee balance nag (never blocks — no suspension for daily fees).
      const outstandingSatang = billingUiEnabled
        ? await container.dailyFeeRepository.outstandingSatang(shopId)
        : 0;
      return { user, shopId, impersonating, t, status, billingUiEnabled, pathname: h.get("x-pathname") ?? "", unread, outstandingSatang, shop };
    });

  // Suspended: block everything except the billing page (so they can pay).
  // When the billing UI is switched off platform-wide, we never dune or block —
  // the use case already keeps isSuspended false for overdue shops, but a
  // defensive gate still avoids trapping anyone in a hidden flow.
  if (
    status.isSuspended &&
    billingUiEnabled &&
    !pathname.startsWith("/shop/billing")
  ) {
    redirect("/shop/billing");
  }

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
      />
      {billingUiEnabled && (
        <>
          <SuspensionBanner status={status} />
          <PreExpiryBanner status={status} />
          {outstandingSatang > 0 && (
            <Link
              href="/shop/billing"
              data-testid="daily-fee-nag"
              className="flex items-center gap-2 bg-warning-surface px-4 py-2 text-sm text-foreground"
            >
              <Wallet className="size-4 shrink-0 text-warning" />
              {t("dailyFeeNag", { amount: satangToBaht(outstandingSatang) })}
            </Link>
          )}
        </>
      )}
      <PausedBanner status={status} resumable />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {children}
        <AppVersion />
      </main>
      <AppTabBar nav="shop" hideBillingNav={!billingUiEnabled} />
    </div>
    </GroupIntlProvider>
  );
}
