import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { isPromotionsEffective } from "@/src/domain/services/promotions-gates";
import { CustomerPromotionsPanel } from "@/src/presentation/components/promotions/CustomerPromotionsPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await container.shopRepository.findBySlug(slug);
  const t = await getTranslations("promotions");
  return {
    title: shop ? `${t("customerTitle")} · ${shop.name}` : t("customerTitle"),
    manifest: shop ? `/s/${slug}/site.webmanifest` : undefined,
  };
}

export default async function ShopCustomerPromotionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop || !isPromotionsEffective(shop)) notFound();

  const all = await container.shopPromotionRepository.listByShop(shop.id, {
    activeOnly: true,
  });
  const now = new Date().toISOString();
  const inWindow = all.filter(
    (p) =>
      (!p.startsAt || p.startsAt <= now) && (!p.endsAt || now <= p.endsAt),
  );

  return <CustomerPromotionsPanel slug={slug} promotions={inWindow} />;
}
