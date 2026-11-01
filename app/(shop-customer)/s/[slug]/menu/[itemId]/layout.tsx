import { notFound } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { GetPublicMenuItemUseCase } from "@/src/application/use-cases/menu/GetPublicMenuItemUseCase";
import { loadPublicMenuShop } from "../load-menu";

/**
 * Segment guard: resolve the item BEFORE the page streams. A notFound() in the
 * page itself runs inside the parent `/s/[slug]/loading.tsx` Suspense boundary,
 * after a 200 has already been committed → not-found UI with status 200.
 */
export default async function PublicMenuItemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const data = await loadPublicMenuShop(slug);
  if (!data) notFound();
  const found = await new GetPublicMenuItemUseCase(
    container.menuCategoryRepository,
    container.menuItemRepository,
  ).execute(data.shop.id, itemId);
  if (!found) notFound();
  return children;
}
