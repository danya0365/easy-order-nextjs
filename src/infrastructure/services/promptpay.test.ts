/**
 * Tests for the PromptPay (Thai EMVCo QR) payload builder. The bug these guard
 * against: a 13-digit national ID must go under merchant sub-tag 02, NOT 03
 * (e-wallet) — otherwise banking apps (K PLUS) reject "ข้อมูล QR ไม่ถูกต้อง".
 *
 * Run via node:test + tsx (server-only is stubbed by tsconfig.test.json).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPromptPayPayload } from "./promptpay";

/** Parse an EMVCo TLV string into an ordered map of id → raw value. */
function parseTlv(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    const value = s.slice(i + 4, i + 4 + len);
    out[id] = value;
    i += 4 + len;
  }
  return out;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — independent re-impl. */
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const NATIONAL_ID = "1960500086397"; // 13 digits
const EWALLET = "012345678901234"; // 15 digits
const MOBILE = "0812345678"; // 10 digits

test("national ID (13 digits) goes under merchant sub-tag 02, not 03", () => {
  const payload = buildPromptPayPayload(NATIONAL_ID, 500);
  const root = parseTlv(payload);
  const merchant = parseTlv(root["29"]);
  assert.equal(merchant["00"], "A000000677010111", "AID present");
  assert.equal(merchant["02"], NATIONAL_ID, "national id under sub-tag 02");
  assert.equal(merchant["03"], undefined, "must NOT use e-wallet sub-tag 03");
});

test("e-wallet (15 digits) goes under merchant sub-tag 03", () => {
  const merchant = parseTlv(parseTlv(buildPromptPayPayload(EWALLET, 100))["29"]);
  assert.equal(merchant["03"], EWALLET);
  assert.equal(merchant["02"], undefined);
});

test("mobile (10 digits) goes under sub-tag 01 as 0066xxxxxxxxx (13 digits)", () => {
  const merchant = parseTlv(parseTlv(buildPromptPayPayload(MOBILE, 50))["29"]);
  assert.equal(merchant["01"], "0066812345678");
  assert.equal(merchant["01"].length, 13);
});

test("dynamic payload: required EMVCo fields + amount as decimal baht", () => {
  const payload = buildPromptPayPayload(NATIONAL_ID, 500);
  const root = parseTlv(payload);
  assert.equal(root["00"], "01", "payload format indicator");
  assert.equal(root["01"], "12", "point-of-init = dynamic");
  assert.equal(root["53"], "764", "currency THB");
  assert.equal(root["54"], "500.00", "amount = decimal baht (EMVCo), not satang");
  assert.equal(root["58"], "TH", "country");
});

test("static payload (no amount): point-of-init 11, no amount tag 54", () => {
  const root = parseTlv(buildPromptPayPayload(NATIONAL_ID));
  assert.equal(root["01"], "11");
  assert.equal(root["54"], undefined);
});

test("CRC: tag 63 is a valid CRC-16/CCITT-FALSE over the rest", () => {
  const payload = buildPromptPayPayload(NATIONAL_ID, 500);
  // Last 8 chars = "6304" + 4-hex CRC. Recompute over everything up to & incl "6304".
  assert.ok(payload.endsWith(payload.slice(-4)));
  const body = payload.slice(0, -4);
  assert.ok(body.endsWith("6304"), "CRC tag prefix present");
  assert.equal(payload.slice(-4), crc16(body), "CRC matches");
});

test("every TLV length prefix matches its value length (well-formed)", () => {
  const payload = buildPromptPayPayload(NATIONAL_ID, 1234.5);
  // Walk the whole string; if any length is wrong, parsing drifts and the final
  // CRC check fails. Re-parse root + merchant and confirm no leftover bytes.
  let i = 0;
  while (i + 4 <= payload.length) {
    const len = Number(payload.slice(i + 2, i + 4));
    assert.ok(Number.isInteger(len) && len >= 0, "2-digit decimal length");
    i += 4 + len;
  }
  assert.equal(i, payload.length, "no trailing/over-read bytes");
});
