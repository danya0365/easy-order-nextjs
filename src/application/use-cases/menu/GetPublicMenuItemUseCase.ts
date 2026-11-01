import type { MenuCategory, MenuItem } from "@/src/domain/entities";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import { isPublicMenuItem } from "@/src/domain/services/public-menu";

/**
 * Read model for the public item detail page: the item only if it belongs to
 * the shop, is available, and sits in an active category (else null → 404).
 */
export class GetPublicMenuItemUseCase {
  constructor(
    private readonly categories: IMenuCategoryRepository,
    private readonly items: IMenuItemRepository,
  ) {}

  async execute(
    shopId: string,
    itemId: string,
  ): Promise<{ item: MenuItem; category: MenuCategory } | null> {
    const item = await this.items.findById(itemId);
    if (!item || item.shopId !== shopId) return null;
    const category = await this.categories.findById(item.categoryId);
    if (!category || !isPublicMenuItem(item, category)) return null;
    return { item, category };
  }
}
