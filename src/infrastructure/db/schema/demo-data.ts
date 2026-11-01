import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { createdAt, id } from "./_shared";
import { shops } from "./shops";

export const DEMO_DATA_KINDS = ["order", "customer", "rider"] as const;

/**
 * Tracks every row created by the admin "demo data" tool so "clear" removes
 * exactly those rows and never touches real data.
 */
export const demoDataRows = sqliteTable(
  "demo_data_rows",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    kind: text({ enum: DEMO_DATA_KINDS }).notNull(),
    rowId: text().notNull(),
    batchId: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("demo_data_rows_shop_idx").on(t.shopId, t.kind)],
);
