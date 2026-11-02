import "server-only";

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";

// Cache the client/db across HMR reloads in dev so we don't open a new
// libSQL connection on every change.
const globalForDb = globalThis as unknown as {
  __esLibsqlClient?: Client;
  __esDb?: LibSQLDatabase<typeof schema>;
};

function buildClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  return createClient({ url, authToken });
}

const client = globalForDb.__esLibsqlClient ?? buildClient();
if (process.env.NODE_ENV !== "production") globalForDb.__esLibsqlClient = client;

export const db =
  globalForDb.__esDb ?? drizzle(client, { schema, casing: "snake_case" });
if (process.env.NODE_ENV !== "production") globalForDb.__esDb = db;

export { schema };
export type Database = typeof db;

/**
 * Run `fn` with a libSQL client scoped to ONE request, closed afterwards.
 * Use for `db.batch` on Workers: the HTTP client keeps the batch's stream on
 * the client instance, and reusing the shared module-level client across
 * requests makes later requests await I/O owned by an earlier one ("Worker
 * code had hung"). A short-lived client keeps that I/O request-local.
 */
export async function withScopedDb<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  // Local/in-memory DBs have no remote stream (and :memory: must stay shared).
  if (url === ":memory:" || url.startsWith("file:")) return fn(db);
  const c = buildClient();
  try {
    return await fn(drizzle(c, { schema, casing: "snake_case" }));
  } finally {
    c.close();
  }
}
