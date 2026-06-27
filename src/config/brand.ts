/**
 * Central brand / product identity — the ONE place to change when cloning this
 * template into a new product (e.g. "Easy Queue").
 *
 * Pure constants with ZERO dependencies on purpose, so every layer
 * (domain/application/infrastructure/presentation) and both server & client can
 * import it without breaking the architecture rules or the client bundle.
 *
 * Note: long marketing prose (privacy policy, tutorial, landing copy) and the
 * static `app/*-image.alt.txt` social files are product-specific copy — a clone
 * rewrites those pages; they intentionally don't read from here.
 */
const NAME = "Easy Order";

export const BRAND = {
  /** Product name shown across UI, page titles, emails/OTP, TOTP issuer. */
  name: NAME,
  /** One-line tagline appended to the name in metadata / hero. */
  tagline: "ระบบสั่งอาหารหน้าร้านด้วยตัวเอง",
  /** Meta description for SEO / social cards. */
  description:
    "ระบบสั่งของหน้าร้านบนแท็บเล็ต ลูกค้ากดเลือกเมนูและสั่งเองได้ จ่ายด้วย QR พร้อมเพย์หรือเงินสด ร้านจัดการคิวออเดอร์ง่ายในที่เดียว",
  /** Issuer label embedded in new TOTP authenticator entries. */
  totpIssuer: NAME,
  /** User-Agent for outbound geocoding requests (OSM politeness policy). */
  userAgent: "EasyOrder/1.0 (+admin tool)",
  /**
   * Logo / icon asset paths (under `public/`). Centralized so a clone can point
   * at differently-named files in one place — the image files themselves still
   * get replaced per clone (see docs/FORKING.md).
   */
  assets: {
    logoMark: "/icons/logo-mark.png",
    logoWordmark: "/icons/logo-wordmark.png",
    icon192: "/icons/icon-192.png",
    icon512: "/icons/icon-512.png",
  },
  /** PWA chrome colors for the installed-app manifest (match the default theme). */
  pwa: {
    backgroundColor: "#fff7ed",
    themeColor: "#f97316",
  },
} as const;
