import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { leads, LEAD_STATUSES } from "./leads";
import { users } from "./users";

/** How the prospect reacted on a visit. */
export const LEAD_VISIT_REACTIONS = [
  "positive",
  "neutral",
  "negative",
  "no_answer",
] as const;
export type LeadVisitReaction = (typeof LEAD_VISIT_REACTIONS)[number];

/** Immutable ledger of every field visit to a lead (audit trail for sales). */
export const leadVisitLogs = sqliteTable(
  "lead_visit_logs",
  {
    id: id(),
    leadId: text()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    reaction: text({ enum: LEAD_VISIT_REACTIONS }).notNull(),
    // Status before/after this visit, for auditability.
    statusBefore: text({ enum: LEAD_STATUSES }),
    statusAfter: text({ enum: LEAD_STATUSES }),
    note: text(),
    // Users are never hard-deleted, so keep this non-null with no cascade.
    performedBy: text()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("lead_visit_logs_lead_created_idx").on(t.leadId, t.createdAt)],
);
