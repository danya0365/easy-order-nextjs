import { container } from "@/src/infrastructure/di/container";
import { getSession } from "@/src/infrastructure/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OSM POIs (shops/amenities with a name) inside a bbox, for the lead map picker.
// Admin-only. Query: ?bbox=south,west,north,east
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "platform_admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const raw = new URL(req.url).searchParams.get("bbox") ?? "";
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return new Response("Bad bbox", { status: 400 });
  }
  const [south, west, north, east] = parts;

  const pois = await container.geocoder.searchPois({ south, west, north, east });
  return Response.json({ pois });
}
