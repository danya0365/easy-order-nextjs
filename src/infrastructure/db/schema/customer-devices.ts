import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { customers } from "./customers";

/**
 * A customer's bound device. `id` is the opaque secret token stored in the
 * customer's httpOnly cookie (eo_member_<slug>) — same pattern as sessions.
 * Obtained only by scanning a one-time bind QR shown at the shop/kiosk.
 */
export const customerDevices = sqliteTable(
  "customer_devices",
  {
    id: id(),
    customerId: text()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    lastSeenAt: text(),
  },
  (t) => [index("customer_devices_customer_idx").on(t.customerId)],
);
