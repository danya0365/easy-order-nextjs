import { test } from "node:test";
import assert from "node:assert/strict";

import {
  googleDirectionsUrl,
  normalizeDeliveryPin,
  normalizeLandmark,
  orderNavigationUrl,
} from "./delivery-location";

test("normalizeDeliveryPin validates and rounds", () => {
  assert.equal(normalizeDeliveryPin(null, undefined), null);
  assert.deepEqual(normalizeDeliveryPin(13.123456789, 100.987654321), { lat: 13.123457, lng: 100.987654 });
  assert.throws(() => normalizeDeliveryPin(13.7, null), /ปักหมุด/);
  assert.throws(() => normalizeDeliveryPin(91, 100), /ไม่ถูกต้อง/);
  assert.throws(() => normalizeDeliveryPin(13, 181), /ไม่ถูกต้อง/);
  assert.throws(() => normalizeDeliveryPin(0, 0), /ไม่ถูกต้อง/);
  assert.throws(() => normalizeDeliveryPin(Number.NaN, 100), /ไม่ถูกต้อง/);
});

test("normalizeLandmark trims and caps", () => {
  assert.equal(normalizeLandmark("  "), null);
  assert.equal(normalizeLandmark(" ข้างเซเว่น "), "ข้างเซเว่น");
  assert.throws(() => normalizeLandmark("x".repeat(121)), /ยาวเกินไป/);
});

test("navigation urls use exact coordinates", () => {
  assert.equal(
    googleDirectionsUrl(13.736512, 100.5603),
    "https://www.google.com/maps/dir/?api=1&destination=13.736512,100.5603",
  );
  assert.equal(
    orderNavigationUrl({ deliveryLat: 13.5, deliveryLng: 100.25, deliveryAddress: "x" }),
    "https://www.google.com/maps/dir/?api=1&destination=13.5,100.25",
  );
  assert.equal(
    orderNavigationUrl({ deliveryLat: null, deliveryLng: null, deliveryAddress: "ซอย 1" }),
    "https://www.google.com/maps/search/?api=1&query=%E0%B8%8B%E0%B8%AD%E0%B8%A2%201",
  );
  assert.equal(orderNavigationUrl({ deliveryLat: null, deliveryLng: null, deliveryAddress: null }), null);
});
