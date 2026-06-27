import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

export const branches = sqliteTable(
  "branches",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text().notNull(),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
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
