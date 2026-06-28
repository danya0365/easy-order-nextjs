import { BRAND } from "@/src/config/brand";

// Web app manifest for the customer's cross-shop area, so an installed icon
// opens "my order history" (the shops they've linked), scoped to /me.
export function GET() {
  const manifest = {
    name: `${BRAND.name} · ออเดอร์ของฉัน`,
    short_name: "ออเดอร์ของฉัน",
    start_url: "/me",
    scope: "/me",
    display: "standalone",
    background_color: BRAND.pwa.backgroundColor,
    theme_color: BRAND.pwa.themeColor,
    icons: [
      {
        src: BRAND.assets.icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND.assets.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
