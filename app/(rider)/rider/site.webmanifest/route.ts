import { BRAND } from "@/src/config/brand";

// Installable rider app, scoped to /rider.
export function GET() {
  return Response.json(
    {
      name: `${BRAND.name} · ไรเดอร์`,
      short_name: "ไรเดอร์",
      start_url: "/rider",
      scope: "/rider",
      display: "standalone",
      background_color: BRAND.pwa.backgroundColor,
      theme_color: BRAND.pwa.themeColor,
      icons: [
        { src: BRAND.assets.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: BRAND.assets.icon512, sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
