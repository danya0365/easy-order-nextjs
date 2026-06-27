import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";

/**
 * A device put into kiosk mode for one shop. The opaque row id is stored in the
 * `eo_kiosk` cookie; orders can only be placed when this row exists + is unexpired,
 * so a forged/copied cookie can't create orders remotely. Revocable per shop.
 */
export const kioskSessions = sqliteTable(
  "kiosk_sessions",
  {
    id: id(),
    shopId: text()
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    /** Optional device label the owner typed when activating (e.g. "เคาน์เตอร์ 1"). */
    label: text(),
    expiresAt: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("kiosk_sessions_shop_idx").on(t.shopId)],
);
