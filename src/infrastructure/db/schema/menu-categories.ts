import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

/** A grouping of menu items within a shop (e.g. "เครื่องดื่ม", "ของหวาน"). */
export const menuCategories = sqliteTable(
  "menu_categories",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull(),
    sortOrder: integer().notNull().default(0),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("menu_categories_shop_idx").on(t.shopId)],
);
