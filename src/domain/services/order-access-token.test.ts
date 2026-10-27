import { test } from "node:test";
import assert from "node:assert/strict";

import {
  signOrderAccessToken,
  verifyOrderAccessToken,
} from "./order-access-token";

const SECRET = "unit-test-secret";
const NOW = new Date("2026-01-15T10:00:00Z");
const PARTS = { shopId: "shop_1", slug: "demo", exp: 1_900_000_000 };

function verify(token: string, shopId = "shop_1", slug = "demo") {
  return verifyOrderAccessToken(token, { shopId, slug, secret: SECRET, now: NOW });
}

test("valid token round-trips", () => {
  const token = signOrderAccessToken(PARTS, SECRET);
  assert.deepEqual(verify(token), PARTS);
});

test("expired token fails", () => {
  const token = signOrderAccessToken({ ...PARTS, exp: 1_500_000_000 }, SECRET);
  assert.equal(verify(token), null);
});

test("tampered payload fails", () => {
  const token = signOrderAccessToken(PARTS, SECRET);
  const other = signOrderAccessToken({ ...PARTS, slug: "other" }, SECRET);
  // Swap in another token's payload segment but keep the original mac.
  const spliced = token.replace(/^v1\.[^]+?\./, other.split(".")[1] + ".");
  assert.equal(verify(spliced), null);
});

test("tampered mac fails", () => {
  const token = signOrderAccessToken(PARTS, SECRET);
  const forged = token.slice(0, -3) + "AAA";
  assert.equal(verify(forged), null);
});

test("wrong secret fails", () => {
  const token = signOrderAccessToken(PARTS, SECRET);
  assert.equal(
    verifyOrderAccessToken(token, { ...PARTS, secret: "other-secret", slug: "demo", now: NOW }),
    null,
  );
});

test("wrong slug / wrong shop fails", () => {
  const token = signOrderAccessToken(PARTS, SECRET);
  assert.equal(verify(token, "shop_1", "other-shop"), null);
  assert.equal(verify(token, "shop_2", "demo"), null);
});

test("malformed tokens fail", () => {
  assert.equal(verify(""), null);
  assert.equal(verify("v1.abc"), null);
  assert.equal(verify("not-a-token"), null);
  assert.equal(verify("v2.a.b"), null);
});
