import type { MenuCategory } from "@/src/domain/entities";

export interface CreateMenuCategoryInput {
  shopId: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateMenuCategoryInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface IMenuCategoryRepository {
  create(input: CreateMenuCategoryInput): Promise<MenuCategory>;
  findById(id: string): Promise<MenuCategory | null>;
  /** All categories for a shop (management view), ordered by sortOrder. */
  listByShop(shopId: string): Promise<MenuCategory[]>;
  /** Active categories only (kiosk view). */
  listActiveByShop(shopId: string): Promise<MenuCategory[]>;
  update(id: string, input: UpdateMenuCategoryInput): Promise<MenuCategory>;
  delete(id: string): Promise<void>;
}
