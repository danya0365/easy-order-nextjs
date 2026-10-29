import { sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";

/**
 * Successful static-QR signups (anti-spam ledger). `ipHash` is an HMAC of the
 * client IP with a server secret — the raw IP is never stored.
 */
export const memberSignupAttempts = sqliteTable(
  "member_signup_attempts",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: text(),
    ipHash: text(),
    deviceId: text(),
    phone: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("msa_shop_created_idx").on(t.shopId, t.createdAt),
    index("msa_shop_ip_idx").on(t.shopId, t.ipHash),
    index("msa_shop_device_idx").on(t.shopId, t.deviceId),
  ],
);

/** Shop-level blocked phones for static-QR membership. */
export const shopBlockedPhones = sqliteTable(
  "shop_blocked_phones",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    phone: text().notNull(),
    createdBy: text(),
    createdAt: createdAt(),
  },
  (t) => [unique("shop_blocked_phones_shop_phone_unique").on(t.shopId, t.phone)],
);
