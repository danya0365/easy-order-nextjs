import { container } from "@/src/infrastructure/di/container";
import { getSession } from "@/src/infrastructure/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reverse geocode a coordinate to an address (+ POI name/category when known).
// Admin-only. Query: ?lat=&lng=
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "platform_admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response("Bad coordinates", { status: 400 });
  }

  const result = await container.geocoder.reverse(lat, lng);
  return Response.json(result);
}
