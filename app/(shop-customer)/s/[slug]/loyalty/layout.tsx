import { notFound } from "next/navigation";

import { isLoyaltyEffective, isSpendPointsOn, isStampCardOn } from "@/src/domain/services/loyalty-gates";
import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";

/** 404 gate (probed before streaming → real 404) so ./loading.tsx can stream. */
export default async function LoyaltyGateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const shop = await shopBySlug((await params).slug);
  if (!shop || !isLoyaltyEffective(shop) || (!isStampCardOn(shop) && !isSpendPointsOn(shop))) notFound();
  return children;
}
