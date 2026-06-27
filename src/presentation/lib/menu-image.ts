import type { MenuItem } from "@/src/domain/entities";

/**
 * URL for a menu item's image, served by `app/api/menu/[itemId]/image`. Returns
 * null when the item has no image. The `?v=<updatedAt>` busts the immutable
 * cache whenever the image is replaced (the storage key stays the same).
 */
export function menuImageSrc(
  item: Pick<MenuItem, "id" | "imageUrl" | "updatedAt">,
): string | null {
  if (!item.imageUrl) return null;
  return `/api/menu/${item.id}/image?v=${encodeURIComponent(item.updatedAt)}`;
}
