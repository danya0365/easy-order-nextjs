import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

/**
 * A promotion banner a shop advertises on its customer PWA (`/s/[slug]/
 * promotions`). Show-window is optional: null startsAt/endsAt = always open.
 * Snapshot-free — rows are edited directly by the owner.
 */
export const shopPromotions = sqliteTable(
  "shop_promotions",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text(),
    /** Optional image URL (https) shown at the top of the card. */
    imageUrl: text(),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    /** Optional show-window (ISO 8601); null start/open end = open-ended. */
    startsAt: text(),
    endsAt: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("shop_promotions_shop_idx").on(t.shopId)],
);
