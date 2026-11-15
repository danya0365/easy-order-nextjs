import {
  sqliteTable,
  uniqueIndex,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";
import { menuItems } from "./menu-items";

export const branches = sqliteTable(
  "branches",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull(),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    // Temporary open/closed switch for ordering ("เปิดรับออเดอร์"): an active
    // branch can still be closed for orders (e.g. holiday) without hiding it.
    acceptingOrders: integer({ mode: "boolean" }).notNull().default(true),
    // Optional physical location, used to plot the branch on the public map.
    // Null until the shop owner sets it from /shop/branches.
    latitude: real(),
    longitude: real(),
    address: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("branches_shop_idx").on(t.shopId)],
);

/**
 * Per-branch menu availability override. The menu itself stays shop-level
 * (shared by every branch); a row here marks one item sold out at one branch.
 */
export const branchMenuOverrides = sqliteTable(
  "branch_menu_overrides",
  {
    id: id(),
    branchId: text()
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    menuItemId: text()
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    soldOut: integer({ mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("branch_menu_overrides_branch_item_unique").on(t.branchId, t.menuItemId)],
);
