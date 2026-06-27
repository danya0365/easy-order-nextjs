import { before, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";

// getClientIp() reads next/headers headers(); drive the IP per test so each gets
// its own rate-limit bucket (the in-memory limiter persists across the file).
let clientIp = "203.0.113.1";
mock.module("next/headers", {
  namedExports: {
    headers: async () =>
      new Map([
        ["x-forwarded-for", clientIp],
        ["user-agent", "test-agent"],
      ]),
  },
});

let POST: typeof import("./route").POST;

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
}

before(async () => {
  await migrateTestDb();
  ({ POST } = await import("./route"));
});

test("accepts a well-formed report (204)", async () => {
  clientIp = "198.51.100.1";
  const res = await post(JSON.stringify({ message: "boom", stack: "at x" }));
  assert.equal(res.status, 204);
});

test("rejects malformed JSON (400)", async () => {
  clientIp = "198.51.100.2";
  const res = await post("{not json");
  assert.equal(res.status, 400);
});

test("rejects an oversized payload (413)", async () => {
  clientIp = "198.51.100.3";
  const res = await post(JSON.stringify({ message: "x".repeat(9000) }));
  assert.equal(res.status, 413);
});

test("rate-limits a flooding client (429 after the cap)", async () => {
  clientIp = "198.51.100.4";
  for (let i = 0; i < 30; i++) {
    const ok = await post(JSON.stringify({ message: `e${i}` }));
    assert.equal(ok.status, 204, `hit ${i} within the window`);
  }
  const blocked = await post(JSON.stringify({ message: "over" }));
  assert.equal(blocked.status, 429);
});
