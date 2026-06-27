import { test } from "node:test";
import assert from "node:assert/strict";

import { sniffImageType, isSupportedImage } from "./image-signature";

/** Build a 16-byte buffer starting with the given header bytes. */
function withHeader(...header: number[]): Uint8Array {
  const buf = new Uint8Array(16);
  buf.set(header, 0);
  return buf;
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
// "RIFF" + 4 size bytes + "WEBP"
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
// 4 bytes + "ftyp" + "heic"
const HEIC = [0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63];

test("recognizes supported image formats by magic bytes", () => {
  assert.equal(sniffImageType(withHeader(...PNG)), "png");
  assert.equal(sniffImageType(withHeader(...JPEG)), "jpeg");
  assert.equal(sniffImageType(withHeader(...WEBP)), "webp");
  assert.equal(sniffImageType(withHeader(...HEIC)), "heic");
});

test("rejects disguised / non-image files regardless of declared type", () => {
  // "<html>" — an HTML/XSS payload renamed .png
  assert.equal(sniffImageType(withHeader(0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e)), null);
  // "%PDF-1.4"
  assert.equal(
    sniffImageType(withHeader(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34)),
    null,
  );
  // GIF ("GIF89a") — a real image, but not in the supported set
  assert.equal(
    sniffImageType(withHeader(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)),
    null,
  );
  assert.equal(isSupportedImage(withHeader(0x3c, 0x68, 0x74, 0x6d, 0x6c)), false);
});

test("rejects truncated / empty buffers", () => {
  assert.equal(sniffImageType(new Uint8Array(0)), null);
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e])), null); // < 12 bytes
});
