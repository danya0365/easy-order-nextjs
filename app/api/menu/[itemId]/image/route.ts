import { container } from "@/src/infrastructure/di/container";

// Serves a menu item's image. Public on purpose: menu photos are shown to
// anonymous walk-in customers on the kiosk. The item is looked up by id so only
// genuine menu images can be read (no arbitrary-key access). Content is cache-
// busted via a `?v=<updatedAt>` query the callers append, so a long immutable
// cache is safe even when an image is replaced under the same storage key.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const item = await container.menuItemRepository.findById(itemId);
  if (!item || !item.imageUrl) return new Response("Not found", { status: 404 });

  const file = await container.slipStorage.read(item.imageUrl);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
