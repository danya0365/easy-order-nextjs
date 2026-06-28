/** Serializable shop data the server component hands to the poster studio. */
export interface PromoSeedData {
  shopName: string;
  /** Public shop URL the poster QR points at (/s/<slug>). */
  publicUrl: string;
  /** QR code as a PNG data URL (server-rendered). */
  qrDataUrl: string;
  /** Profile image inlined as a base64 data URL, or null. Avoids canvas taint. */
  profileImageDataUrl: string | null;
}

/** Which of the three studio paths is active. */
export type PromoPath = "template" | "ai_prompt" | "upload";
