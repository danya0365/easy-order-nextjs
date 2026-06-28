import {
  sqliteTable,
  text,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shopCategories } from "./shop-categories";
import { shops } from "./shops";
import { users } from "./users";

/** Sales-funnel stage of a prospect shop the operator is courting. */
export const LEAD_STATUSES = [
  "new",
  "visited",
  "interested",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Why a prospect declined — used to refine the next sales round. */
export const LEAD_LOST_REASONS = [
  "not_interested",
  "too_expensive",
  "no_smartphone",
  "closed_business",
  "competitor",
  "other",
] as const;
export type LeadLostReason = (typeof LEAD_LOST_REASONS)[number];

/**
 * A prospect shop the operator surveys in the field — kept fully separate from
 * the billable `shops` table so cold leads never touch billing/analytics. On a
 * won deal it is converted to a real shop (see `convertedShopId`).
 */
export const leads = sqliteTable(
  "leads",
  {
    id: id(),
    name: text().notNull(),
    // Optional reference to a shop category (reuses the shops' reference data).
    categoryId: text().references(() => shopCategories.id, {
      onDelete: "set null",
    }),
    address: text(),
    phone: text(),
    // Optional physical location, used to plot the lead on the admin map.
    latitude: real(),
    longitude: real(),
    // Storage key of the shop photo (served via /api/lead-photos/[leadId]).
    photoUrl: text(),
    status: text({ enum: LEAD_STATUSES }).notNull().default("new"),
    // Only set when status = "lost".
    lostReason: text({ enum: LEAD_LOST_REASONS }),
    // ISO-8601; when this passes the daily cron reminds admins to follow up.
    nextFollowUpAt: text(),
    // ISO-8601 of the last follow-up reminder sent for the *current* due date.
    // The cron only reminds when this is null or older than nextFollowUpAt, so a
    // lead is announced once per due date (idempotent) — rescheduling re-arms it.
    followUpNotifiedAt: text(),
    notes: text(),
    // Set on conversion: links to the real shop that was created from this lead.
    convertedShopId: text().references(() => shops.id, { onDelete: "set null" }),
    convertedAt: text(),
    // Operator who added the lead. Users are never hard-deleted (no cascade).
    createdBy: text().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("leads_status_created_idx").on(t.status, t.createdAt),
    index("leads_followup_idx").on(t.nextFollowUpAt),
    index("leads_created_id_idx").on(t.createdAt, t.id),
  ],
);
