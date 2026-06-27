import { test } from "node:test";
import assert from "node:assert/strict";

import { totpAt, CryptoTotpService } from "./CryptoTotpService";

// RFC 6238 Appendix B test vectors (SHA-1, secret = ASCII "12345678901234567890").
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // base32 of the seed

test("matches RFC 6238 SHA-1 test vectors (6-digit)", () => {
  assert.equal(totpAt(RFC_SECRET, 59), "287082");
  assert.equal(totpAt(RFC_SECRET, 1111111109), "081804");
  assert.equal(totpAt(RFC_SECRET, 1111111111), "050471");
  assert.equal(totpAt(RFC_SECRET, 1234567890), "005924");
  assert.equal(totpAt(RFC_SECRET, 2000000000), "279037");
});

test("verify accepts the current code and rejects a wrong one", () => {
  const svc = new CryptoTotpService();
  const secret = svc.generateSecret();
  const now = Math.floor(Date.now() / 1000);
  assert.equal(svc.verify(secret, totpAt(secret, now)), true);
  assert.equal(svc.verify(secret, "000000"), false);
  assert.equal(svc.verify(secret, "abc"), false);
});

test("generateSecret produces a decodable base32 secret + valid otpauth URI", () => {
  const svc = new CryptoTotpService();
  const secret = svc.generateSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  const uri = svc.keyUri(secret, "admin@example.com");
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.ok(uri.includes(`secret=${secret}`));
});
