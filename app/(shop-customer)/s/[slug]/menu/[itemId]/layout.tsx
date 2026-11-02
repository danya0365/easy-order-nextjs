import { notFound } from "next/navigation";

import { loadPublicMenuItem, loadPublicMenuShop } from "../load-menu";

/**
 * 404 gate for the item detail. Layouts are probed by vinext BEFORE the
 * response is committed, so notFound() here is a real 404 — which lets
 * ./loading.tsx stream a skeleton for the page below. Lookups are request-
 * memoized and reused by the page (no extra DB work).
 */
export default async function MenuItemGateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const data = await loadPublicMenuShop(slug);
  if (!data) notFound();
  const found = await loadPublicMenuItem(data.shop.id, itemId);
  if (!found) notFound();
  return children;
}
