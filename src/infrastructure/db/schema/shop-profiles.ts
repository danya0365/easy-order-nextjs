import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { updatedAt } from "./_shared";
import { shops } from "./shops";

/**
 * Owner-managed public-facing shop details (1:1 with a shop). All optional —
 * shown on the public page /s/[slug] to help walk-in customers decide.
 */
export const shopProfiles = sqliteTable("shop_profiles", {
  shopId: text()
    .primaryKey()
    .references(() => shops.id, { onDelete: "cascade" }),
  description: text(),
  openingHours: text(),
  phone: text(),
  lineUrl: text(),
  facebookUrl: text(),
  instagramUrl: text(),
  websiteUrl: text(),
  updatedAt: updatedAt(),
});
