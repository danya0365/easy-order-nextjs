import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "../../src/infrastructure/db/schema";

export type SeedDb = LibSQLDatabase<typeof schema>;

export interface SeedContext {
  db: SeedDb;
  /** Pre-computed bcrypt hash of DEFAULT_PASSWORD (shared across seed users). */
  passwordHash: string;
  log: (msg: string) => void;
}

export const DEFAULT_PASSWORD = "password123";

export function createSeedDb(): { db: SeedDb; client: Client } {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema, casing: "snake_case" });
  return { db, client };
}

/** True when seeding against a remote (production) Turso DB rather than a local file. */
export function isRemoteDb(): boolean {
  return /^(libsql|https|wss):/.test(process.env.TURSO_DATABASE_URL ?? "");
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export { schema };
