import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Fixed-window rate-limit counters. One row per logical key (e.g.
 * "otp:ip:1.2.3.4", "login:email:a@b.com", "contact:ip:1.2.3.4").
 * `count` is the hits in the current window; `resetAt` (ISO) is when it rolls
 * over. DB-backed so it works across serverless instances (no Redis).
 */
export const rateLimits = sqliteTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  resetAt: text().notNull(),
});
