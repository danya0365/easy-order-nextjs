import { container } from "@/src/infrastructure/di/container";
import { getSession } from "@/src/infrastructure/auth/session";

// Serves an uploaded payment slip image, gated to the platform admin or the
// owning shop. GET is uncached by default in Next 16 (fine for a private file).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { paymentId } = await params;
  const payment = await container.paymentRepository.findById(paymentId);
  if (!payment) return new Response("Not found", { status: 404 });

  const allowed =
    user.role === "platform_admin" ||
    (user.role === "shop_owner" && user.shopId === payment.shopId);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const file = await container.slipStorage.read(payment.slipUrl);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
