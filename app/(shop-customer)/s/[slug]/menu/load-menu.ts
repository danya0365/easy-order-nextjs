import "server-only";

import { container } from "@/src/infrastructure/di/container";
import { GetPublicMenuItemUseCase } from "@/src/application/use-cases/menu/GetPublicMenuItemUseCase";
import { requestMemo } from "@/src/infrastructure/request/request-memo";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import type { PublicMenuShop } from "@/src/presentation/components/public-menu/types";
import { shopBySlug, shopImages } from "@/src/infrastructure/request/shop-lookups";

/** Shop identity for the public menu pages (read-only; cached per request). */
export const loadPublicMenuShop = (slug: string) => requestMemo(`publicMenuShop:${slug}`, async () => {
  const shop = await shopBySlug(slug);
  if (!shop) return null;
  const [images, profile, branches, category] = await Promise.all([
    shopImages(shop.id),
    container.shopProfileRepository.get(shop.id),
    container.branchRepository.listByShop(shop.id),
    shop.categoryId
      ? container.shopCategoryRepository.findById(shop.categoryId)
      : Promise.resolve(null),
  ]);
  const cover = images.find((i) => i.kind === "cover");
  const logo = images.find((i) => i.kind === "profile");
  const branch = branches.find((b) => b.isActive && b.address) ?? branches[0] ?? null;
  const view: PublicMenuShop = {
    slug,
    name: shop.name,
    logoSrc: logo ? `/api/shop-images/${logo.id}` : (shop.logoUrl ?? null),
    coverSrc: cover ? `/api/shop-images/${cover.id}` : null,
    categoryName: category?.name ?? null,
    profile,
    branch: branch ? { name: branch.name, address: branch.address } : null,
  };
  return { shop, view };
});

/** Active categories with all items (sold-out ones flagged via isAvailable=false) (same read model as the kiosk). */
export const loadPublicMenuSections = (shopId: string) =>
  requestMemo(`publicMenuSections:${shopId}`, () =>
    new GetKioskMenuUseCase(container.menuCategoryRepository, container.menuItemRepository).execute(shopId, { includeSoldOut: true }),
  );

/** One public item (+ its category); shared by the [itemId] layout gate, metadata and page. */
export const loadPublicMenuItem = (shopId: string, itemId: string) =>
  requestMemo(`publicMenuItem:${shopId}:${itemId}`, () =>
    new GetPublicMenuItemUseCase(container.menuCategoryRepository, container.menuItemRepository).execute(shopId, itemId),
  );
