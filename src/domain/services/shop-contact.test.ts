import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isValidThaiId13,
  normalizePromptPayTarget,
  normalizeLineContact,
  normalizeFacebookUrl,
  normalizeShopPhone,
  maskPromptPay,
} from "./shop-contact";

// 1101700230708 is a well-known checksum-valid sample id.
test("thai id checksum", () => {
  assert.equal(isValidThaiId13("1101700230708"), true);
  assert.equal(isValidThaiId13("1101700230709"), false);
  assert.equal(isValidThaiId13("123"), false);
});

test("promptpay accepts mobile / id13 / ewallet, strips separators", () => {
  assert.equal(normalizePromptPayTarget("081-234-5678"), "0812345678");
  assert.equal(normalizePromptPayTarget("1-1017-00230-70-8"), "1101700230708");
  assert.equal(normalizePromptPayTarget("123456789012345"), "123456789012345");
  assert.equal(normalizePromptPayTarget("  "), null);
  assert.equal(normalizePromptPayTarget(null), null);
});

test("promptpay rejects bad checksum, landline, letters", () => {
  assert.throws(() => normalizePromptPayTarget("1101700230709"));
  assert.throws(() => normalizePromptPayTarget("0212345678"));
  assert.throws(() => normalizePromptPayTarget("08123x5678"));
  assert.throws(() => normalizePromptPayTarget("12345"));
});

test("line contact: id, @official, url", () => {
  assert.equal(normalizeLineContact("myshop"), "https://line.me/ti/p/~myshop");
  assert.equal(normalizeLineContact("@easyshop"), "https://line.me/R/ti/p/@easyshop");
  assert.equal(normalizeLineContact("lin.ee/abc"), "https://lin.ee/abc");
  assert.equal(normalizeLineContact("https://line.me/R/ti/p/@x1"), "https://line.me/R/ti/p/@x1");
  assert.equal(normalizeLineContact(""), null);
  assert.throws(() => normalizeLineContact("https://evil.com/line"));
  assert.throws(() => normalizeLineContact("bad id!"));
});

test("facebook url host check", () => {
  assert.equal(normalizeFacebookUrl("facebook.com/shop"), "https://facebook.com/shop");
  assert.equal(normalizeFacebookUrl("https://m.facebook.com/x"), "https://m.facebook.com/x");
  assert.equal(normalizeFacebookUrl(""), null);
  assert.throws(() => normalizeFacebookUrl("https://notfacebook.co/x"));
});

test("shop phone + mask", () => {
  assert.equal(normalizeShopPhone("02-123-4567"), "021234567");
  assert.equal(normalizeShopPhone("0812345678"), "0812345678");
  assert.equal(normalizeShopPhone(""), null);
  assert.throws(() => normalizeShopPhone("12345"));
  assert.equal(maskPromptPay("0812345678"), "••••••5678");
});
