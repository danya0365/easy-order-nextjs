import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extForContentType,
  slipKey,
  leadPhotoKey,
  shopImageKey,
  contentTypeForKey,
} from "./slip-media";

test("extForContentType maps content-type, falls back to filename", () => {
  assert.equal(extForContentType("image/png", "x"), "png");
  assert.equal(extForContentType("image/jpeg", "x"), "jpg");
  assert.equal(extForContentType("image/webp", "x"), "webp");
  // Unknown type → derive from filename extension.
  assert.equal(extForContentType("application/octet-stream", "pic.jpg"), "jpg");
  assert.equal(extForContentType("application/octet-stream", "noext"), "bin");
});

test("key helpers build the expected storage keys", () => {
  assert.equal(slipKey("p1", "png"), "slips/p1.png");
  assert.equal(leadPhotoKey("l1", "jpg"), "leads/l1.jpg");
  assert.equal(shopImageKey("s1", "i1", "webp"), "shops/s1/i1.webp");
});

test("contentTypeForKey infers from extension", () => {
  assert.equal(contentTypeForKey("slips/p1.png"), "image/png");
  assert.equal(contentTypeForKey("shops/s1/i1.jpg"), "image/jpeg");
  assert.equal(contentTypeForKey("x/y.bin"), "application/octet-stream");
});
