import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";
import { menuCategories } from "./menu-categories";

/** A single orderable item on a shop's menu. Price is stored in satang. */
export const menuItems = sqliteTable(
  "menu_items",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    categoryId: text()
      .notNull()
      .references(() => menuCategories.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    priceSatang: integer().notNull(),
    imageUrl: text(),
    isAvailable: integer({ mode: "boolean" }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("menu_items_shop_idx").on(t.shopId),
    index("menu_items_category_idx").on(t.categoryId),
  ],
);
