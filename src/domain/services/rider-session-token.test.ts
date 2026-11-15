import { test } from "node:test";
import assert from "node:assert/strict";

import { isRiderSessionValue, signRiderSession, verifyRiderSession } from "./rider-session-token";

test("rider session token: sign/verify, tamper, wrong secret", () => {
  const v = signRiderSession({ accountId: "ra_abc-DEF_1", epoch: 3, scope: ["m1", "m2", "m1"] }, "s3cret");
  assert.ok(isRiderSessionValue(v));
  assert.deepEqual(verifyRiderSession(v, "s3cret"), { accountId: "ra_abc-DEF_1", epoch: 3, scope: ["m2", "m1"].sort() && ["m1", "m2"] });
  assert.equal(verifyRiderSession(v, "other"), null);
  const parts = v.split(".");
  assert.equal(verifyRiderSession([parts[0], parts[1], parts[2], "m1~m2~m3", parts[4]].join("."), "s3cret"), null, "scope cannot be widened");
  assert.equal(verifyRiderSession([parts[0], "other", ...parts.slice(2)].join("."), "s3cret"), null);
  assert.equal(verifyRiderSession("v2.x", "s3cret"), null);
  assert.equal(isRiderSessionValue("A".repeat(43)), false);
});
