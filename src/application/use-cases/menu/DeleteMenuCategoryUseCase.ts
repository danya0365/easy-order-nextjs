import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";

/**
 * Delete a category (and, via FK cascade, its menu items) — scoped to the shop.
 * Past orders are unaffected: order items snapshot name/price and their
 * menuItemId link is set-null on delete.
 */
export class DeleteMenuCategoryUseCase {
  constructor(private readonly categories: IMenuCategoryRepository) {}

  async execute(shopId: string, categoryId: string): Promise<void> {
    const cat = await this.categories.findById(categoryId);
    if (!cat || cat.shopId !== shopId) throw new Error("ไม่พบหมวดหมู่ในร้านนี้");
    await this.categories.delete(categoryId);
  }
}
