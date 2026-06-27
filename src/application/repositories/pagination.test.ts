/**
 * Pure-function tests for cursor pagination.
 * Run: npx tsx --test src/application/repositories/pagination.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { encodeCursor, decodeCursor, toPage } from "./pagination";

const row = (createdAt: string, id: string) => ({ createdAt, id });

test("encode/decode round-trips a position", () => {
  const pos = { createdAt: "2026-06-15T10:00:00.000Z", id: "abc123" };
  const decoded = decodeCursor(encodeCursor(pos));
  assert.deepEqual(decoded, pos);
});

test("decode tolerates malformed / empty input", () => {
  assert.equal(decodeCursor(null), null);
  assert.equal(decodeCursor(undefined), null);
  assert.equal(decodeCursor(""), null);
  assert.equal(decodeCursor("not-base64-$$$"), null);
  // base64 of a string with no separator -> null
  assert.equal(decodeCursor(Buffer.from("noseparator").toString("base64")), null);
});

test("decode keeps an id that itself contains separators are impossible (ids/iso have no '|')", () => {
  // createdAt ISO has no '|'; first '|' splits cleanly.
  const c = encodeCursor({ createdAt: "2026-01-01T00:00:00.000Z", id: "x_y-z" });
  assert.deepEqual(decodeCursor(c), {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "x_y-z",
  });
});

test("toPage: fewer than limit -> no next cursor", () => {
  const page = toPage([row("t3", "c"), row("t2", "b")], 5);
  assert.equal(page.items.length, 2);
  assert.equal(page.nextCursor, null);
});

test("toPage: exactly limit -> no next cursor", () => {
  const rows = [row("t3", "c"), row("t2", "b")];
  const page = toPage(rows, 2);
  assert.equal(page.items.length, 2);
  assert.equal(page.nextCursor, null);
});

test("toPage: limit + 1 -> drops extra, cursor points at last kept item", () => {
  const rows = [row("t3", "c"), row("t2", "b"), row("t1", "a")];
  const page = toPage(rows, 2);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[1].id, "b");
  assert.deepEqual(decodeCursor(page.nextCursor), { createdAt: "t2", id: "b" });
});

test("toPage: equal createdAt -> id is the tiebreaker in the cursor", () => {
  const rows = [
    row("2026-06-15T10:00:00.000Z", "z"),
    row("2026-06-15T10:00:00.000Z", "m"),
    row("2026-06-15T10:00:00.000Z", "a"),
  ];
  const page = toPage(rows, 2);
  assert.deepEqual(decodeCursor(page.nextCursor), {
    createdAt: "2026-06-15T10:00:00.000Z",
    id: "m",
  });
});
