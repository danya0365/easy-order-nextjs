import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";
import { shops } from "./shops";
import { users } from "./users";

export const CONTACT_REQUEST_STATUSES = ["open", "resolved"] as const;
// "operator" = sent by a logged-in shop owner; "public" = sent from the login
// page by someone who can't sign in (no shop/user attached).
export const CONTACT_REQUEST_SOURCES = ["operator", "public"] as const;

/** A request for the platform admin to contact someone back (operator or public). */
export const contactRequests = sqliteTable(
  "contact_requests",
  {
    id: id(),
    // Nullable: public (login-page) requests have no shop/user attached.
    shopId: text().references(() => shops.id, { onDelete: "cascade" }),
    createdBy: text().references(() => users.id),
    // Email the reporter typed (public requests) so admin can find the account.
    email: text(),
    source: text({ enum: CONTACT_REQUEST_SOURCES }).notNull().default("operator"),
    // Caller IP (public requests) — abuse forensics; rate-limit uses rate_limits.
    ipAddress: text(),
    subject: text().notNull(),
    message: text().notNull(),
    // How the admin should reach back (phone / LINE id / email — free text).
    contactChannel: text().notNull(),
    status: text({ enum: CONTACT_REQUEST_STATUSES }).notNull().default("open"),
    resolvedBy: text().references(() => users.id),
    resolvedAt: text(),
    createdAt: createdAt(),
  },
  (t) => [index("contact_requests_status_created_idx").on(t.status, t.createdAt)],
);
