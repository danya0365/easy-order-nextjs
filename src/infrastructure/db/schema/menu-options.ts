import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";
import { menuItems } from "./menu-items";

/**
 * Option group (modifier group) on one menu item, e.g. "ระดับความหวาน"
 * (required, pick 1) or "ท็อปปิ้ง" (optional, pick up to 3).
 */
export const menuOptionGroups = sqliteTable(
  "menu_option_groups",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    menuItemId: text()
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    name: text().notNull(),
    isRequired: integer({ mode: "boolean" }).notNull().default(false),
    minSelect: integer().notNull().default(0),
    maxSelect: integer().notNull().default(1),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("menu_option_groups_item_idx").on(t.menuItemId)],
);

/** One choice in an option group; `priceDeltaSatang` is added to the unit price. */
export const menuOptionChoices = sqliteTable(
  "menu_option_choices",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    groupId: text()
      .notNull()
      .references(() => menuOptionGroups.id, { onDelete: "cascade" }),
    name: text().notNull(),
    priceDeltaSatang: integer().notNull().default(0),
    isAvailable: integer({ mode: "boolean" }).notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("menu_option_choices_group_idx").on(t.groupId)],
);
