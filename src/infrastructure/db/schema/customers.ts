import { sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";

/**
 * Customers are identified by phone (normalized digits) and scoped per shop —
 * the same phone is an independent customer in each shop. Optional: a walk-in
 * order stays anonymous unless the customer gives a phone at checkout.
 */
export const customers = sqliteTable(
  "customers",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    phone: text().notNull(),
    displayName: text(),
    // Opaque code embedded in the customer's QR (so staff can scan instead of
    // typing the phone). Per-customer, resolved server-side & scoped by shop.
    publicCode: text()
      .notNull()
      .unique()
      .$defaultFn(() => nanoid(12)),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("customers_shop_phone_unique").on(t.shopId, t.phone),
    index("customers_shop_idx").on(t.shopId),
    // (shopId, createdAt) backs the customer list's keyset pagination.
    index("customers_shop_created_idx").on(t.shopId, t.createdAt),
  ],
);
