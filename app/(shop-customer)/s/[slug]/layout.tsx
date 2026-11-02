import { notFound } from "next/navigation";

import { isLoyaltyEffective } from "@/src/domain/services/loyalty-gates";
import { isPromotionsEffective } from "@/src/domain/services/promotions-gates";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { ShopShellHeader } from "@/src/presentation/components/layout/ShopShellHeader";
import { ShopNavPending } from "@/src/presentation/components/layout/ShopNavPending";
import { ShopTabBar } from "@/src/presentation/components/layout/ShopTabBar";
import { shopBySlug, shopImages } from "@/src/infrastructure/request/shop-lookups";

/**
 * Per-shop customer PWA shell: shop-scoped header + bottom tabs.
 * Route group `(shop-customer)` keeps URLs at `/s/[slug]/...` while isolating
 * this tree from the platform `(public)` CustomerTabBar.
 */
export default async function ShopCustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await shopBySlug(slug);
  if (!shop) notFound();

  const images = await shopImages(shop.id);
  const profileImage = images.find((i) => i.kind === "profile") ?? null;

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <ShopShellHeader
        slug={slug}
        shopName={shop.name}
        profileImageId={profileImage?.id ?? null}
      />
      <div className="relative flex-1">
        {children}
        <ShopNavPending slug={slug} />
      </div>
      <AppVersion />
      <ShopTabBar
        slug={slug}
        showLoyalty={isLoyaltyEffective(shop)}
        showPromotions={isPromotionsEffective(shop)}
      />
    </div>
  );
}
