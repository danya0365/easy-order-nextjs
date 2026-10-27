import { notFound } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { isLoyaltyEffective } from "@/src/domain/services/loyalty-gates";
import { AppVersion } from "@/src/presentation/components/layout/AppVersion";
import { ShopShellHeader } from "@/src/presentation/components/layout/ShopShellHeader";
import { ShopTabBar } from "@/src/presentation/components/layout/ShopTabBar";

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
  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) notFound();

  const images = await container.shopImageRepository.listByShop(shop.id);
  const profileImage = images.find((i) => i.kind === "profile") ?? null;

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom)+4rem)]">
      <ShopShellHeader
        slug={slug}
        shopName={shop.name}
        profileImageId={profileImage?.id ?? null}
      />
      <div className="flex-1">{children}</div>
      <AppVersion />
      <ShopTabBar slug={slug} showLoyalty={isLoyaltyEffective(shop)} />
    </div>
  );
}
