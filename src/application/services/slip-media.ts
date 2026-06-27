import type { SaveSlipInput } from "@/src/application/services/ISlipStorage";

/** Slip image content-type ↔ file-extension maps, shared by all slip stores. */
export const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
};

export const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
};

/** Pick a file extension from a content-type, falling back to the filename. */
export function extForContentType(contentType: string, filename: string): string {
  const fromType = EXT_BY_TYPE[contentType];
  if (fromType) return fromType;
  const fromName = filename.split(".").pop()?.toLowerCase();
  return fromName && TYPE_BY_EXT[fromName] ? fromName : "bin";
}

/** Pick a file extension from the content-type, falling back to the filename. */
export function extFor(input: SaveSlipInput): string {
  return extForContentType(input.contentType, input.filename);
}

/** Storage key for a slip (also the value stored in payments.slipUrl). */
export function slipKey(paymentId: string, ext: string): string {
  return `slips/${paymentId}.${ext}`;
}

/** Storage key for a lead photo (also the value stored in leads.photoUrl). */
export function leadPhotoKey(leadId: string, ext: string): string {
  return `leads/${leadId}.${ext}`;
}

/** Storage key for a shop image (stored in shop_images.storageKey). */
export function shopImageKey(
  shopId: string,
  imageId: string,
  ext: string,
): string {
  return `shops/${shopId}/${imageId}.${ext}`;
}

/** content-type from a stored key/url like "slips/<id>.png". */
export function contentTypeForKey(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXT[ext] ?? "application/octet-stream";
}
