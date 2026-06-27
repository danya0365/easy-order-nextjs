/**
 * Sniff a file's real image type from its magic bytes — independent of the
 * declared MIME type or extension. Used to reject disguised uploads (e.g. an
 * html/js/svg/pdf renamed `.png`) that pass a MIME-only check.
 *
 * Pure (Uint8Array in, no I/O) so it lives in the domain layer and is unit-tested.
 */
export type ImageType = "png" | "jpeg" | "webp" | "heic";

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const b = bytes;
  if (b.length < 12) return null;

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "png";
  }

  // JPEG — FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";

  // WEBP — "RIFF"...."WEBP"
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "webp";
  }

  // HEIC / HEIF — ISOBMFF "ftyp" box at offset 4 (iPhone photos). Lenient on the
  // brand: the goal is to block non-media files, not to be a strict HEIF parser,
  // and the declared MIME is checked separately.
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    return "heic";
  }

  return null;
}

/** True when the bytes are one of the supported real image formats. */
export function isSupportedImage(bytes: Uint8Array): boolean {
  return sniffImageType(bytes) !== null;
}
