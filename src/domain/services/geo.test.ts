import { test } from "node:test";
import assert from "node:assert/strict";

import { validateLatLng, normalizeAddress } from "./geo";

test("validateLatLng accepts a valid pair and both-null", () => {
  assert.doesNotThrow(() => validateLatLng({ latitude: 13.7, longitude: 100.5 }));
  assert.doesNotThrow(() => validateLatLng({ latitude: null, longitude: null }));
  assert.doesNotThrow(() => validateLatLng({ latitude: -90, longitude: 180 }));
});

test("validateLatLng rejects only-one-set", () => {
  assert.throws(() => validateLatLng({ latitude: 13.7, longitude: null }));
  assert.throws(() => validateLatLng({ latitude: null, longitude: 100.5 }));
});

test("validateLatLng rejects out-of-range", () => {
  assert.throws(() => validateLatLng({ latitude: 91, longitude: 0 }));
  assert.throws(() => validateLatLng({ latitude: -91, longitude: 0 }));
  assert.throws(() => validateLatLng({ latitude: 0, longitude: 181 }));
  assert.throws(() => validateLatLng({ latitude: 0, longitude: -181 }));
});

test("normalizeAddress trims, empties to null, caps at 200", () => {
  assert.equal(normalizeAddress("  ที่อยู่  "), "ที่อยู่");
  assert.equal(normalizeAddress(""), null);
  assert.equal(normalizeAddress("   "), null);
  assert.equal(normalizeAddress(null), null);
  assert.equal(normalizeAddress(undefined), null);
  assert.throws(() => normalizeAddress("x".repeat(201)));
  assert.equal(normalizeAddress("x".repeat(200))?.length, 200);
});
