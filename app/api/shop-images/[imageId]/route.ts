import { container } from "@/src/infrastructure/di/container";

// Serves a shop image (profile/cover/gallery). Public on purpose: shop imagery
// is shown to anonymous visitors on the directory, map popups, and the public
// shop page. Looked up by id so only genuine shop images can be read (no
// arbitrary-key access). Long immutable cache — images are never replaced under
// the same id (a replacement gets a fresh nanoid).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;
  const image = await container.shopImageRepository.findById(imageId);
  if (!image) return new Response("Not found", { status: 404 });

  const file = await container.slipStorage.read(image.storageKey);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
