import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Guard: the order sticky bar must sit above the fixed shop tab bar
// (h-16 = 4rem + safe-area inset) instead of bottom-0 behind it.
test("OnlineOrdering sticky bar is offset above the shop tab bar", () => {
  const src = readFileSync("src/presentation/components/order/OnlineOrdering.tsx", "utf8");
  const m = src.match(/className="(sticky [^"]+)"\s+data-testid="order-sticky-bar"/);
  assert.ok(m, "sticky bar found");
  assert.match(m[1], /bottom-\[calc\(env\(safe-area-inset-bottom\)\+4rem\)\]/);
  assert.doesNotMatch(m[1], /\bbottom-0\b/);
});
