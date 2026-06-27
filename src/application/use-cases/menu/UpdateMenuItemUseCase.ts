import type { MenuItem } from "@/src/domain/entities";
import type {
  IMenuItemRepository,
  UpdateMenuItemInput,
} from "@/src/application/repositories/IMenuItemRepository";
import type { IMenuCategoryRepository } from "@/src/application/repositories/IMenuCategoryRepository";

/** Edit / toggle availability of a menu item — scoped to the owning shop. */
export class UpdateMenuItemUseCase {
  constructor(
    private readonly items: IMenuItemRepository,
    private readonly categories: IMenuCategoryRepository,
  ) {}

  async execute(
    shopId: string,
    itemId: string,
    input: UpdateMenuItemInput,
  ): Promise<MenuItem> {
    const item = await this.items.findById(itemId);
    if (!item || item.shopId !== shopId) throw new Error("ไม่พบเมนูในร้านนี้");

    const patch: UpdateMenuItemInput = { ...input };
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 80) {
        throw new Error("ชื่อเมนูต้องยาว 1–80 ตัวอักษร");
      }
      patch.name = name;
    }
    if (input.priceSatang !== undefined) {
      if (!Number.isInteger(input.priceSatang) || input.priceSatang < 0) {
        throw new Error("ราคาไม่ถูกต้อง");
      }
    }
    if (input.categoryId !== undefined) {
      const cat = await this.categories.findById(input.categoryId);
      if (!cat || cat.shopId !== shopId) throw new Error("ไม่พบหมวดหมู่ในร้านนี้");
    }
    if (input.description !== undefined) {
      patch.description = input.description?.trim() || null;
    }
    return this.items.update(itemId, patch);
  }
}
