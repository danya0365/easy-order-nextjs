import { test } from "node:test";
import assert from "node:assert/strict";

import {
  assertValidPassword,
  assertPasswordAcceptable,
  MIN_PASSWORD_LENGTH,
} from "./password-policy";

test("length policy", () => {
  assert.throws(() => assertValidPassword("short"), /อย่างน้อย/);
  assert.doesNotThrow(() => assertValidPassword("a".repeat(MIN_PASSWORD_LENGTH)));
});

test("assertPasswordAcceptable: rejects breached, accepts clean (length ok)", async () => {
  const breached = { isBreached: async () => true };
  const clean = { isBreached: async () => false };

  await assert.rejects(
    assertPasswordAcceptable("longenoughpw", breached),
    /รั่วไหล/,
  );
  await assert.doesNotReject(assertPasswordAcceptable("longenoughpw", clean));
  // Too short is rejected before the breach check even runs.
  await assert.rejects(assertPasswordAcceptable("short", clean), /อย่างน้อย/);
});
