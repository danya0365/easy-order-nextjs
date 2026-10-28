import type { ShopPromotion } from "@/src/domain/entities";

export interface CreateShopPromotionInput {
  shopId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  /** ISO 8601 show-window; null = open-ended on that side. */
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdateShopPromotionInput {
  title?: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface IShopPromotionRepository {
  create(input: CreateShopPromotionInput): Promise<ShopPromotion>;
  findById(id: string): Promise<ShopPromotion | null>;
  listByShop(
    shopId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<ShopPromotion[]>;
  update(id: string, input: UpdateShopPromotionInput): Promise<ShopPromotion>;
  setActive(id: string, isActive: boolean): Promise<ShopPromotion>;
  delete(id: string): Promise<void>;
}
