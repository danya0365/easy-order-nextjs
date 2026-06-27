import type { ShopImage, ShopImageKind } from "@/src/domain/entities";

export interface CreateShopImageInput {
  id: string;
  shopId: string;
  kind: ShopImageKind;
  storageKey: string;
  sortOrder?: number;
}

export interface IShopImageRepository {
  create(input: CreateShopImageInput): Promise<ShopImage>;
  /** All images for a shop: by sortOrder then oldest-first. */
  listByShop(shopId: string): Promise<ShopImage[]>;
  findById(id: string): Promise<ShopImage | null>;
  findProfile(shopId: string): Promise<ShopImage | null>;
  /** Batched profile image ids for many shops (shopId → imageId). */
  profilesByShop(shopIds: string[]): Promise<Record<string, string>>;
  delete(id: string): Promise<void>;
  /** Every image storage key — for orphaned-file cleanup. */
  allStorageKeys(): Promise<string[]>;
}
