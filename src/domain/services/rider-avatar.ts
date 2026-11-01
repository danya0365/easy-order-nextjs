import { sniffImageType } from "./image-signature";

export const RIDER_AVATAR_MAX_BYTES = 4 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" } as const;

/**
 * Validate a rider profile photo: JPEG/PNG/WEBP only, 1 byte–4MB, and the magic
 * bytes must match the declared type. Returns the file extension. Pure.
 */
export function validateRiderAvatar(contentType: string, bytes: Uint8Array): "jpg" | "png" | "webp" {
  const declared = TYPES[contentType as keyof typeof TYPES];
  if (!declared) throw new Error("รองรับเฉพาะรูป JPG/PNG/WEBP");
  if (bytes.byteLength === 0) throw new Error("ไม่พบไฟล์รูป");
  if (bytes.byteLength > RIDER_AVATAR_MAX_BYTES) throw new Error("ไฟล์ใหญ่เกิน 4MB");
  if (sniffImageType(bytes) !== declared) throw new Error("ไฟล์ไม่ใช่รูปภาพที่รองรับ");
  return declared === "jpeg" ? "jpg" : declared;
}
