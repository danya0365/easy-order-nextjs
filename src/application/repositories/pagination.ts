/**
 * Shared cursor-pagination contract used by every `page*` repository method.
 *
 * Cursors are an opaque base64 of `"<createdAt>|<id>"`. Sorting is always
 * newest-first (`createdAt DESC, id DESC`); the `id` is a stable tiebreaker
 * because `createdAt` (an ISO string) is NOT unique — two rows inserted in the
 * same millisecond would otherwise be skipped or duplicated across pages.
 */

export interface Page<T> {
  items: T[];
  /** Pass back to fetch the next page; null means no more rows. */
  nextCursor: string | null;
}

export interface PageOpts {
  limit?: number;
  cursor?: string | null;
}

/** The decoded position of the last item on the previous page. */
export interface CursorPosition {
  createdAt: string;
  id: string;
}

export function encodeCursor(pos: CursorPosition): string {
  return Buffer.from(`${pos.createdAt}|${pos.id}`, "utf8").toString("base64");
}

/** Tolerant decode — any malformed/empty input yields null (treated as page 1). */
export function decodeCursor(
  cursor: string | null | undefined,
): CursorPosition | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf8");
    const sep = raw.indexOf("|");
    if (sep <= 0 || sep === raw.length - 1) return null;
    return { createdAt: raw.slice(0, sep), id: raw.slice(sep + 1) };
  } catch {
    return null;
  }
}

/**
 * Turn a `limit + 1` fetch into a {@link Page}. If an extra row came back there
 * is another page; drop it and derive `nextCursor` from the last kept item.
 * Pure (no DB deps) so it can be unit-tested directly.
 */
export function toPage<T extends { createdAt: string; id: string }>(
  rows: T[],
  limit: number,
): Page<T> {
  if (rows.length <= limit) {
    return { items: rows, nextCursor: null };
  }
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: encodeCursor({ createdAt: last.createdAt, id: last.id }),
  };
}
