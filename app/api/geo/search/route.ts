import { container } from "@/src/infrastructure/di/container";
import { getSession } from "@/src/infrastructure/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Forward place search (Thailand) to recenter the map. Admin-only. Query: ?q=
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "platform_admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await container.geocoder.search(q);
  return Response.json({ results });
}
