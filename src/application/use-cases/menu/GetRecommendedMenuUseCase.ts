import type { MenuItem } from "@/src/domain/entities";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import { selectRecommendedMenuItems } from "@/src/domain/services/recommended-menu";

/** Public shop-home "เมนูแนะนำ": curated marks or auto fallback (max 6). */
export class GetRecommendedMenuUseCase {
  constructor(
    private readonly categories: IMenuCategoryRepository,
    private readonly items: IMenuItemRepository,
  ) {}

  async execute(shopId: string): Promise<MenuItem[]> {
    const [categories, items] = await Promise.all([
      this.categories.listByShop(shopId),
      this.items.listByShop(shopId),
    ]);
    return selectRecommendedMenuItems(items, categories);
  }
}
