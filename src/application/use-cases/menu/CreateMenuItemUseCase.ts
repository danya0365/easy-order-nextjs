import type { MenuItem } from "@/src/domain/entities";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";

export interface CreateMenuItemUseCaseInput {
  shopId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  priceSatang: number;
  imageUrl?: string | null;
}

/** Add an item to a shop's menu, validating it and its parent category. */
export class CreateMenuItemUseCase {
  constructor(
    private readonly items: IMenuItemRepository,
    private readonly categories: IMenuCategoryRepository,
  ) {}

  async execute(input: CreateMenuItemUseCaseInput): Promise<MenuItem> {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 80) {
      throw new Error("ชื่อเมนูต้องยาว 1–80 ตัวอักษร");
    }
    if (!Number.isInteger(input.priceSatang) || input.priceSatang < 0) {
      throw new Error("ราคาไม่ถูกต้อง");
    }
    const cat = await this.categories.findById(input.categoryId);
    if (!cat || cat.shopId !== input.shopId) {
      throw new Error("ไม่พบหมวดหมู่ในร้านนี้");
    }
    const existing = await this.items.listByShop(input.shopId);
    return this.items.create({
      shopId: input.shopId,
      categoryId: input.categoryId,
      name,
      description: input.description?.trim() || null,
      priceSatang: input.priceSatang,
      imageUrl: input.imageUrl ?? null,
      sortOrder: existing.length,
    });
  }
}
