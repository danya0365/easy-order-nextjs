import { test } from "node:test";
import assert from "node:assert/strict";

import { retry } from "./retry";

const noSleep = () => Promise.resolve();

test("returns immediately on first success (no retries)", async () => {
  let calls = 0;
  const out = await retry(
    async () => {
      calls++;
      return "ok";
    },
    { sleep: noSleep },
  );
  assert.equal(out, "ok");
  assert.equal(calls, 1);
});

test("retries then succeeds", async () => {
  let calls = 0;
  const out = await retry(
    async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return calls;
    },
    { retries: 2, sleep: noSleep },
  );
  assert.equal(out, 3);
  assert.equal(calls, 3); // 1 initial + 2 retries
});

test("throws the last error after exhausting retries", async () => {
  let calls = 0;
  await assert.rejects(
    retry(
      async () => {
        calls++;
        throw new Error(`fail ${calls}`);
      },
      { retries: 2, sleep: noSleep },
    ),
    /fail 3/,
  );
  assert.equal(calls, 3);
});

test("shouldRetry=false stops immediately", async () => {
  let calls = 0;
  await assert.rejects(
    retry(
      async () => {
        calls++;
        throw new Error("non-retryable");
      },
      { retries: 5, shouldRetry: () => false, sleep: noSleep },
    ),
    /non-retryable/,
  );
  assert.equal(calls, 1);
});
