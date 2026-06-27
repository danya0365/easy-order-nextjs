import type { MenuCategory } from "@/src/domain/entities";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";

/** Create a menu category for a shop. Keep validation here, not in the action. */
export class CreateMenuCategoryUseCase {
  constructor(private readonly categories: IMenuCategoryRepository) {}

  async execute(shopId: string, name: string): Promise<MenuCategory> {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      throw new Error("ชื่อหมวดหมู่ต้องยาว 1–60 ตัวอักษร");
    }
    const existing = await this.categories.listByShop(shopId);
    return this.categories.create({
      shopId,
      name: trimmed,
      sortOrder: existing.length,
    });
  }
}
