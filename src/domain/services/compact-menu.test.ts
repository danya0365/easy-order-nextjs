import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COMPACT_DEFAULTS,
  compactOptionsQuery,
  contentSizeMm,
  parseCompactOptions,
  pickFitScale,
  sheetSizeMm,
} from "./compact-menu";

test("parseCompactOptions: defaults + junk fallback", () => {
  assert.deepEqual(parseCompactOptions({}), COMPACT_DEFAULTS);
  assert.deepEqual(parseCompactOptions({ paper: "A5", cols: "9", thumbs: "x" }), COMPACT_DEFAULTS);
});

test("parseCompactOptions: explicit values", () => {
  assert.deepEqual(
    parseCompactOptions({ paper: "A3", orient: "landscape", cols: "4", thumbs: "1", desc: "0", footer: "0" }),
    { paper: "A3", orient: "landscape", cols: 4, thumbs: true, desc: false, footer: false },
  );
});

test("compactOptionsQuery round-trips and omits defaults", () => {
  assert.equal(compactOptionsQuery(COMPACT_DEFAULTS), "");
  const o = { ...COMPACT_DEFAULTS, paper: "A3" as const, cols: 4 as const, desc: false };
  assert.deepEqual(parseCompactOptions(Object.fromEntries(new URLSearchParams(compactOptionsQuery(o)))), o);
});

test("sheet/content sizes", () => {
  assert.deepEqual(sheetSizeMm("A4", "portrait"), { w: 210, h: 297 });
  assert.deepEqual(sheetSizeMm("A3", "landscape"), { w: 420, h: 297 });
  assert.deepEqual(contentSizeMm("A4", "landscape"), { w: 281, h: 194 });
});

test("pickFitScale: prefers one sheet at the largest legible scale", () => {
  // height proportional to scale²-ish: 1200 at 1.0
  const m = (s: number) => 1200 * s * s;
  assert.deepEqual(pickFitScale(m, 1300), { scale: 1, sheets: 1 });
  assert.deepEqual(pickFitScale(m, 1000), { scale: 0.9, sheets: 1 });
});

test("pickFitScale: falls back to two sheets, then reports overflow", () => {
  const m = (s: number) => 3000 * s;
  // one sheet would need < 0.75 → two sheets at the largest fitting scale
  assert.deepEqual(pickFitScale(m, 1600), { scale: 1, sheets: 2 });
  assert.deepEqual(pickFitScale(m, 1300), { scale: 0.85, sheets: 2 });
  assert.deepEqual(pickFitScale(m, 500), { scale: 0.65, sheets: 4 });
});
