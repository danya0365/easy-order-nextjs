import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { updatedAt } from "./_shared";

/**
 * Platform-wide singleton settings (id = "default"). Controls soft-launch
 * billing behaviour: whether the billing UI shows, whether billing activates
 * only after an order threshold, and whether overdue shops are actually
 * suspended (off = warn-only during soft launch).
 */
export const platformSettings = sqliteTable("platform_settings", {
  id: text().primaryKey(),
  /** Show billing UI to shop owners (off during soft launch = hide everything). */
  billingUiEnabled: integer({ mode: "boolean" }).notNull().default(true),
  /** Bill only after the shop reached this many orders (0/few = free preview). */
  orderThresholdBillingEnabled: integer({ mode: "boolean" })
    .notNull()
    .default(false),
  orderThresholdCount: integer().notNull().default(50),
  /** Soft-launch: off = overdue shops keep working (warn-only), admin suspend still applies. */
  shopSuspensionEnabled: integer({ mode: "boolean" }).notNull().default(false),
  updatedAt: updatedAt(),
});
