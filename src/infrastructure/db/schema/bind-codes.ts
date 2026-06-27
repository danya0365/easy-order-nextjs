import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { createdAt } from "./_shared";
import { shops } from "./shops";
import { customers } from "./customers";

/**
 * One-time, short-lived code embedded in the "bind QR" shown on the kiosk screen.
 * Scanning it links the scanning device to the customer (issues a token).
 * Secure because: single-use (usedAt), expiring (expiresAt), shop-scoped.
 */
export const bindCodes = sqliteTable(
  "bind_codes",
  {
    code: text()
      .primaryKey()
      .$defaultFn(() => nanoid(10)),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    expiresAt: text().notNull(),
    usedAt: text(),
    createdAt: createdAt(),
  },
  (t) => [index("bind_codes_customer_idx").on(t.customerId)],
);
