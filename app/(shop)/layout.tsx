import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { container } from "@/src/infrastructure/di/container";
import { AppHeader } from "@/src/presentation/components/layout/AppHeader";
import { AppTabBar } from "@/src/presentation/components/layout/AppTabBar";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { ImpersonationBanner } from "@/src/presentation/components/admin/ImpersonationBanner";
import { SuspensionBanner } from "@/src/presentation/components/billing/SuspensionBanner";
import { PreExpiryBanner } from "@/src/presentation/components/billing/PreExpiryBanner";
import { PausedBanner } from "@/src/presentation/components/billing/PausedBanner";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, shopId, impersonating } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const { status } = await getBillingState(shopId);
  const pathname = (await headers()).get("x-pathname") ?? "";
  // Impersonating admins have no shop-owner notifications of their own.
  const unread = impersonating
    ? 0
    : await container.notificationRepository.countUnread(user.id);
  const shop = impersonating ? await container.shopRepository.findById(shopId) : null;

  // Suspended: block everything except the billing page (so they can pay).
  if (status.isSuspended && !pathname.startsWith("/shop/billing")) {
    redirect("/shop/billing");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {impersonating && (
        <ImpersonationBanner shopName={shop?.name ?? "—"} />
      )}
      <AppHeader
        role={impersonating ? t("roleImpersonating") : t("roleShop")}
        userEmail={user.email}
        notifications={{ href: "/shop/notifications", unread }}
      />
      <SuspensionBanner status={status} />
      <PreExpiryBanner status={status} />
      <PausedBanner status={status} resumable />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {children}
        <AppVersion />
      </main>
      <AppTabBar nav="shop" />
    </div>
  );
}
