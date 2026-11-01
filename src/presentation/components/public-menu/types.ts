import type { Branch, ShopProfile } from "@/src/domain/entities";

/** Display-only shop identity for the public menu (no secrets, no ids beyond slug). */
export interface PublicMenuShop {
  slug: string;
  name: string;
  logoSrc: string | null;
  coverSrc: string | null;
  categoryName: string | null;
  profile: ShopProfile | null;
  branch: Pick<Branch, "name" | "address"> | null;
}
