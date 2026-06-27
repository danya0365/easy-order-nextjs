import type { MenuCategory } from "@/src/domain/entities";
import type {
  IMenuCategoryRepository,
  UpdateMenuCategoryInput,
} from "@/src/application/repositories/IMenuCategoryRepository";

/** Rename / reorder / toggle a category — scoped to the owning shop. */
export class UpdateMenuCategoryUseCase {
  constructor(private readonly categories: IMenuCategoryRepository) {}

  async execute(
    shopId: string,
    categoryId: string,
    input: UpdateMenuCategoryInput,
  ): Promise<MenuCategory> {
    const cat = await this.categories.findById(categoryId);
    if (!cat || cat.shopId !== shopId) throw new Error("ไม่พบหมวดหมู่ในร้านนี้");
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 60) {
        throw new Error("ชื่อหมวดหมู่ต้องยาว 1–60 ตัวอักษร");
      }
      input = { ...input, name };
    }
    return this.categories.update(categoryId, input);
  }
}
