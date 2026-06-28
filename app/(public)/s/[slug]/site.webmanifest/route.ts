import { container } from "@/src/infrastructure/di/container";
import { BRAND } from "@/src/config/brand";

// Per-shop web app manifest so an installed icon opens THIS shop's page
// (order history + menu/info), scoped to /s/<slug>.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) return new Response("Not found", { status: 404 });

  const manifest = {
    name: `${shop.name} · สั่งอาหาร`,
    short_name: shop.name.slice(0, 20),
    start_url: `/s/${slug}`,
    scope: `/s/${slug}`,
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
