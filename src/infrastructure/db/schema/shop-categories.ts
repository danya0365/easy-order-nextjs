import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";

/**
 * Reference data: types of shops (ร้านกาแฟ, เบเกอรี่, ...). Seeded as starter
 * data; a shop optionally references one (used by the /shops directory filter +
 * the admin leads tool). Managed by the platform admin.
 */
export const shopCategories = sqliteTable("shop_categories", {
  id: id(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  sortOrder: integer().notNull().default(0),
  isActive: integer({ mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});
