import type { ShopCategory } from "@/src/domain/entities";

export interface IShopCategoryRepository {
  /** Active categories, ordered for display. */
  listActive(): Promise<ShopCategory[]>;
  findById(id: string): Promise<ShopCategory | null>;
}
