import type { MenuItem } from "@/src/domain/entities";

export interface CreateMenuItemInput {
  shopId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  priceSatang: number;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface UpdateMenuItemInput {
  categoryId?: string;
  name?: string;
  description?: string | null;
  priceSatang?: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface IMenuItemRepository {
  create(input: CreateMenuItemInput): Promise<MenuItem>;
  findById(id: string): Promise<MenuItem | null>;
  /** All items for a shop (management view). */
  listByShop(shopId: string): Promise<MenuItem[]>;
  /** Available items only (kiosk view). */
  listAvailableByShop(shopId: string): Promise<MenuItem[]>;
  update(id: string, input: UpdateMenuItemInput): Promise<MenuItem>;
  delete(id: string): Promise<void>;
  /** Storage keys of every item image (for orphaned-file cleanup). */
  allImageKeys(): Promise<string[]>;
}
