import "server-only";

import { and, eq, lt, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import type { CursorPosition } from "@/src/application/repositories/pagination";

// `toPage` lives in the (DB-free) pagination module so it stays unit-testable;
// re-exported here so repositories import both helpers from one place.
export { toPage } from "@/src/application/repositories/pagination";

/**
 * WHERE fragment for keyset pagination over `(createdAt DESC, id DESC)`:
 * everything strictly "older" than the cursor position. Returns undefined for
 * the first page so callers can spread it into `and(...)` safely.
 */
export function cursorWhere(
  createdAtCol: SQLiteColumn,
  idCol: SQLiteColumn,
  cur: CursorPosition | null,
): SQL | undefined {
  if (!cur) return undefined;
  return or(
    lt(createdAtCol, cur.createdAt),
    and(eq(createdAtCol, cur.createdAt), lt(idCol, cur.id)),
  );
}
