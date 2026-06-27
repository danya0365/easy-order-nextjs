import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";

/** A shop's cover banner / profile image (max one each) or a gallery photo (many). */
export const SHOP_IMAGE_KINDS = ["profile", "gallery", "cover"] as const;
export type ShopImageKind = (typeof SHOP_IMAGE_KINDS)[number];

/** Owner-uploaded shop imagery shown on the public shop page + directory + map. */
export const shopImages = sqliteTable(
  "shop_images",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    kind: text({ enum: SHOP_IMAGE_KINDS }).notNull(),
    // Storage key (served publicly via /api/shop-images/[imageId]).
    storageKey: text().notNull(),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("shop_images_shop_idx").on(t.shopId)],
);
