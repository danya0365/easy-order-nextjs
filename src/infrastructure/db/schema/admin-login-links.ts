import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";
import { users } from "./users";

/**
 * Admin-issued one-time login links for a shop. Only the SHA-256 hash of the
 * random token is stored; the raw token is shown to the admin exactly once.
 */
export const adminLoginLinks = sqliteTable(
  "admin_login_links",
  {
    id: id(),
    // 'shop' = choose a shop account on open; 'admin' = log in as targetUserId
    // (a platform admin; CLI-issued with DB creds). shopId is null for 'admin'.
    kind: text({ enum: ["shop", "admin"] }).notNull().default("shop"),
    shopId: text().references(() => shops.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique(),
    createdBy: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: text().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: text().notNull(),
    usedAt: text(),
    usedByUserId: text().references(() => users.id, { onDelete: "set null" }),
    revokedAt: text(),
  },
  (t) => [index("all_shop_idx").on(t.shopId, t.expiresAt)],
);
