import { test } from "node:test";
import assert from "node:assert/strict";

import { extractCustomerCode, signCustomerClaim, verifyCustomerClaim } from "./customer-claim";

const SECRET = "test-secret";

test("claim sig: round-trips and binds slug + code", () => {
  const sig = signCustomerClaim("demo", "qfG7mlkSlXxY", SECRET);
  assert.equal(sig.length, 22);
  assert.equal(verifyCustomerClaim("demo", "qfG7mlkSlXxY", sig, SECRET), true);
  assert.equal(verifyCustomerClaim("other", "qfG7mlkSlXxY", sig, SECRET), false);
  assert.equal(verifyCustomerClaim("demo", "qfG7mlkSlXxZ", sig, SECRET), false);
  assert.equal(verifyCustomerClaim("demo", "qfG7mlkSlXxY", sig, "other-secret"), false);
  assert.equal(verifyCustomerClaim("demo", "qfG7mlkSlXxY", "", SECRET), false);
  assert.equal(verifyCustomerClaim("demo", "bad code!", sig, SECRET), false);
});

test("extractCustomerCode: raw code, claim URL, legacy ?c= URL", () => {
  assert.equal(extractCustomerCode("  qfG7mlkSlXxY "), "qfG7mlkSlXxY");
  assert.equal(
    extractCustomerCode("https://x.example/s/demo/member/claim?code=qfG7mlkSlXxY&sig=abc"),
    "qfG7mlkSlXxY",
  );
  assert.equal(extractCustomerCode("https://x.example/s/demo?c=abc123"), "abc123");
  assert.equal(extractCustomerCode("https://x.example/s/demo"), "https://x.example/s/demo");
  assert.equal(extractCustomerCode("สมชาย"), "สมชาย");
});
