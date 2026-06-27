import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { HibpPasswordBreachChecker } from "./HibpPasswordBreachChecker";

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function suffixOf(password: string): string {
  return createHash("sha1").update(password).digest("hex").toUpperCase().slice(5);
}

test("hibp retries a transient 5xx then reports the breach", async () => {
  const pw = "hunter2hunter2";
  let calls = 0;
  global.fetch = (async () => {
    calls++;
    if (calls === 1) return new Response("upstream", { status: 503 });
    return new Response(`${suffixOf(pw)}:42\nABCDE:1`, { status: 200 });
  }) as typeof fetch;

  const checker = new HibpPasswordBreachChecker();
  assert.equal(await checker.isBreached(pw), true);
  assert.equal(calls, 2, "retried once after the 503");
});

test("hibp fails open (false) when the API keeps erroring", async () => {
  let calls = 0;
  global.fetch = (async () => {
    calls++;
    return new Response("down", { status: 500 });
  }) as typeof fetch;

  const checker = new HibpPasswordBreachChecker();
  assert.equal(await checker.isBreached("whatever-pw"), false);
  assert.equal(calls, 3, "initial attempt + 2 retries, then gives up");
});

test("hibp does not retry a 4xx (treated as permanent), failing open", async () => {
  let calls = 0;
  global.fetch = (async () => {
    calls++;
    return new Response("bad request", { status: 400 });
  }) as typeof fetch;

  const checker = new HibpPasswordBreachChecker();
  assert.equal(await checker.isBreached("whatever-pw"), false);
  assert.equal(calls, 1, "4xx is permanent — no retry");
});
