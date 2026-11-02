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
