import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id } from "./_shared";
import { shops } from "./shops";
import { orders } from "./orders";
import { menuItems } from "./menu-items";

/**
 * One line of an order. `nameSnapshot`/`unitPriceSatang` are captured at order
 * time so later menu edits never rewrite historical orders. `menuItemId` keeps a
 * (set-null) link for analytics; deleting a menu item doesn't void past orders.
 */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: id(),
    orderId: text()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    menuItemId: text().references(() => menuItems.id, { onDelete: "set null" }),
    nameSnapshot: text().notNull(),
    unitPriceSatang: integer().notNull(),
    quantity: integer().notNull(),
    lineTotalSatang: integer().notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);
