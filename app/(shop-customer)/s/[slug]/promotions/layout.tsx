import { notFound } from "next/navigation";

import { isPromotionsEffective } from "@/src/domain/services/promotions-gates";
import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";

/** 404 gate (probed before streaming → real 404) so ./loading.tsx can stream. */
export default async function PromotionsGateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const shop = await shopBySlug((await params).slug);
  if (!shop || !isPromotionsEffective(shop)) notFound();
  return children;
}
