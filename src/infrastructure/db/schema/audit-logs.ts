import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { id, createdAt } from "./_shared";

/**
 * Append-only security/support audit trail. Records WHO did WHAT, WHEN, FROM
 * WHERE for sensitive actions (logins, password resets, suspensions, payment
 * verification, impersonation, abuse alerts …). Deliberately has NO foreign keys
 * so the trail survives even if the actor/shop is later deleted.
 */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    // Null for anonymous/system events (e.g. a failed login for an unknown email).
    actorUserId: text(),
    actorRole: text(),
    // Free-text action name (e.g. "login_failed", "password_reset"). Not an enum
    // so new actions don't need a migration; well-known names live in AUDIT_ACTIONS.
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    // Tenant scope, for the per-shop activity drill-down. Null for platform events.
    shopId: text(),
    ip: text(),
    userAgent: text(),
    // JSON blob of extra context (reason, attempted email, counts …), or null.
    metadata: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_shop_created_idx").on(t.shopId, t.createdAt),
    index("audit_actor_created_idx").on(t.actorUserId, t.createdAt),
    index("audit_action_created_idx").on(t.action, t.createdAt),
  ],
);
