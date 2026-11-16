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
  /** Order-threshold DAILY FEE billing (replaces day-based top-up billing). */
  dailyFeeBillingEnabled: integer({ mode: "boolean" }).notNull().default(false),
  /** A business day with billable orders STRICTLY greater than this is charged. */
  dailyOrderThreshold: integer().notNull().default(50),
  dailyFeeSatang: integer().notNull().default(500),
  /** Business-day cutoff "HH:MM" Asia/Bangkok (per-shop override on shops). */
  defaultCutoffTime: text().notNull().default("04:00"),
  /** Feature switch: menu options/add-ons platform-wide (still needs per-shop allow). */
  menuOptionsEnabled: integer({ mode: "boolean" }).notNull().default(false),
  /** Feature switch: tap a menu item to open the detail sheet (default on). */
  itemDetailEnabled: integer({ mode: "boolean" }).notNull().default(true),
  /** Rider ว่าง/ไม่ว่าง: "global" = one switch for all shops; "per_shop" = one per shop. */
  riderAvailabilityMode: text({ enum: ["global", "per_shop"] }).notNull().default("global"),
  /** Branch staff may work their branch's order queue (accept → complete, assign rider). */
  branchStaffQueueEnabled: integer({ mode: "boolean" }).notNull().default(true),
  /** Platform switch: branch staff may cancel own-branch orders (still needs the shop switch). */
  branchStaffCancelEnabled: integer({ mode: "boolean" }).notNull().default(true),
  /** Platform switch: lucky wheel (หมุนวงล้อ) feature (still needs the shop switch). */
  luckyWheelEnabled: integer({ mode: "boolean" }).notNull().default(true),
  updatedAt: updatedAt(),
});
