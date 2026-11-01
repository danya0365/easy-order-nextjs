import { test } from "node:test";
import assert from "node:assert/strict";

import { RIDER_AVATAR_MAX_BYTES, validateRiderAvatar } from "./rider-avatar";
import { riderAvatarSrc } from "./rider-contact";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]);

test("rider avatar validation", () => {
  assert.equal(validateRiderAvatar("image/jpeg", jpeg), "jpg");
  assert.equal(validateRiderAvatar("image/png", png), "png");
  assert.throws(() => validateRiderAvatar("image/gif", jpeg), /JPG/);
  assert.throws(() => validateRiderAvatar("image/svg+xml", jpeg));
  assert.throws(() => validateRiderAvatar("image/png", jpeg), /ไม่ใช่รูป/, "declared type must match bytes");
  assert.throws(() => validateRiderAvatar("image/jpeg", new TextEncoder().encode("<html><script>x</script>")));
  assert.throws(() => validateRiderAvatar("image/jpeg", new Uint8Array()), /ไม่พบ/);
  const big = new Uint8Array(RIDER_AVATAR_MAX_BYTES + 1);
  big.set(jpeg);
  assert.throws(() => validateRiderAvatar("image/jpeg", big), /4MB/);
});

test("riderAvatarSrc", () => {
  assert.equal(riderAvatarSrc({ id: "r1", avatarUrl: null }), null);
  assert.equal(riderAvatarSrc({ id: "r1", avatarUrl: "riders/s/r1/abc.jpg" }), "/api/rider-avatars/r1?v=abc");
});

test("customerDeliveryView: en route only while assigned/picked_up", async () => {
  const { customerDeliveryView: v } = await import("./rider-contact");
  assert.equal(v({ status: "accepted", riderId: "r", deliveryStatus: "assigned" }), "en_route");
  assert.equal(v({ status: "accepted", riderId: "r", deliveryStatus: "picked_up" }), "en_route");
  assert.equal(v({ status: "accepted", riderId: "r", deliveryStatus: "delivered" }), "delivered");
  assert.equal(v({ status: "accepted", riderId: null, deliveryStatus: null }), null);
  assert.equal(v({ status: "cancelled", riderId: "r", deliveryStatus: "assigned" }), null);
});
