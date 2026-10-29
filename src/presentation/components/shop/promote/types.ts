/** Serializable shop data the server component hands to the poster studio. */
export interface PromoSeedData {
  shopName: string;
  /** Public shop URL the poster QR points at (/s/<slug>). */
  publicUrl: string;
  /** QR code as a PNG data URL (server-rendered). */
  qrDataUrl: string;
  /** Profile image inlined as a base64 data URL, or null. Avoids canvas taint. */
  profileImageDataUrl: string | null;
  /** Which QR this seed carries (drives the caption). Defaults to "shop". */
  qrMode?: PromoQrMode;
}

/** Which QR the poster carries. */
export type PromoQrMode = "join" | "shop";

/** What the server page hands the studio: both QR options (join may be null). */
export interface PromoPageSeed {
  shopName: string;
  /** Public shop URL (/s/<slug>) — safe to show as text. */
  publicUrl: string;
  shopQrDataUrl: string;
  /** Static join QR (/s/<slug>/join?k=…) or null when static join is off.
   *  The URL itself is never sent to the client so the token never shows as text. */
  joinQrDataUrl: string | null;
  profileImageDataUrl: string | null;
}

/** Which of the three studio paths is active. */
export type PromoPath = "template" | "ai_prompt" | "upload";
