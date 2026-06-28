import type { ShopProfile } from "@/src/domain/entities";

export interface ShopProfileInput {
  description: string | null;
  openingHours: string | null;
  phone: string | null;
  lineUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
}

export interface IShopProfileRepository {
  get(shopId: string): Promise<ShopProfile | null>;
  /** Create or replace the shop's public profile. */
  upsert(shopId: string, input: ShopProfileInput): Promise<ShopProfile>;
}
