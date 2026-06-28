import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";
import { customers } from "./customers";

/**
 * A customer's review of a shop. One per (shop, customer) — editable. Only
 * device-bound customers can post (resolved from the member token). The shop
 * owner may reply; a platform admin may hide abusive reviews.
 */
export const shopReviews = sqliteTable(
  "shop_reviews",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    // 1–5 stars (validated in the use case).
    rating: integer().notNull(),
    comment: text(),
    ownerReply: text(),
    ownerRepliedAt: text(),
    // Admin moderation: hidden reviews are excluded from public views.
    isHidden: integer({ mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("shop_reviews_shop_customer_unique").on(t.shopId, t.customerId),
    index("shop_reviews_shop_created_idx").on(t.shopId, t.createdAt),
    index("shop_reviews_created_id_idx").on(t.createdAt, t.id),
  ],
);
