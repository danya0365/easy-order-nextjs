import "server-only";

import { cache } from "react";

import { container } from "@/src/infrastructure/di/container";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import type { PublicMenuShop } from "@/src/presentation/components/public-menu/types";

/** Shop identity for the public menu pages (read-only; cached per request). */
export const loadPublicMenuShop = cache(async (slug: string) => {
  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) return null;
  const [images, profile, branches, category] = await Promise.all([
    container.shopImageRepository.listByShop(shop.id),
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

/** Active categories with available items only (same read model as the kiosk). */
export const loadPublicMenuSections = cache((shopId: string) =>
  new GetKioskMenuUseCase(container.menuCategoryRepository, container.menuItemRepository).execute(shopId),
);
