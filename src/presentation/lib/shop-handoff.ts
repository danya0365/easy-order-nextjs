/**
 * Credentials + links to hand a newly-created shop owner. Returned ONCE by the
 * create/convert server actions (the plaintext password the admin just typed,
 * never persisted) and rendered immediately by the handoff card.
 */
export interface ShopHandoff {
  shopName: string;
  slug: string;
  /** Public shop page, /s/[slug]. */
  publicUrl: string;
  ownerEmail: string;
  /** Plaintext password — shown once, not stored. */
  ownerPassword: string;
  /** App login page the QR points at. */
  loginUrl: string;
  /** QR (PNG data URL) encoding loginUrl. */
  loginQrDataUrl: string;
}
