import type { MenuCategory, MenuItem } from "@/src/domain/entities";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";

export interface KioskMenuSection {
  category: MenuCategory;
  items: MenuItem[];
}

/**
 * Read model for the kiosk: active categories, each with its available items.
 * Empty categories are dropped so customers never see an empty section.
 */
export class GetKioskMenuUseCase {
  constructor(
    private readonly categories: IMenuCategoryRepository,
    private readonly items: IMenuItemRepository,
  ) {}

  async execute(shopId: string): Promise<KioskMenuSection[]> {
    const [categories, items] = await Promise.all([
      this.categories.listActiveByShop(shopId),
      this.items.listAvailableByShop(shopId),
    ]);
    const byCategory = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.categoryId) ?? [];
      list.push(item);
      byCategory.set(item.categoryId, list);
    }
    return categories
      .map((category) => ({ category, items: byCategory.get(category.id) ?? [] }))
      .filter((section) => section.items.length > 0);
  }
}
