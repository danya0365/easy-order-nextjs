import { container } from "@/src/infrastructure/di/container";
import { getSession } from "@/src/infrastructure/auth/session";

// Serves a credit top-up slip, gated to the platform admin or the owning shop.
export async function GET(_request: Request, { params }: { params: Promise<{ topupId: string }> }) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { topupId } = await params;
  const topup = await container.creditRepository.findTopup(topupId);
  if (!topup) return new Response("Not found", { status: 404 });
  const allowed = user.role === "platform_admin" || (user.role === "shop_owner" && user.shopId === topup.shopId);
  if (!allowed) return new Response("Forbidden", { status: 403 });
  const file = await container.slipStorage.read(topup.slipUrl);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.bytes), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store" } });
}
