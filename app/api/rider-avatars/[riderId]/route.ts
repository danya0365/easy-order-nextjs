import { container } from "@/src/infrastructure/di/container";

// Serves a rider's profile photo. Public on purpose (shown to the customer on
// the en-route status and to the owner). Looked up by rider id so only genuine
// rider avatars can be read; a replacement gets a fresh key, so `?v=` busts the
// long immutable cache.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ riderId: string }> },
) {
  const { riderId } = await params;
  const key = await container.riderRepository.findAvatarKey(riderId);
  if (!key) return new Response("Not found", { status: 404 });
  const file = await container.slipStorage.read(key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
