/**
 * Downscale an already-cropped canvas into a JPEG upload File.
 *
 * The cropper hands us the cropped region as a `<canvas>`, so we only need to
 * re-encode + shrink it: `browser-image-compression` caps it to ≤1MB at 2000px
 * so large phone photos stay well under the server-action body limit and don't
 * silently fail to upload on mobile.
 */
export async function canvasToCompressedFile(
  canvas: HTMLCanvasElement,
  baseName: string,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("สร้างรูปไม่สำเร็จ");

  const { default: imageCompression } = await import("browser-image-compression");
  const compressed = await imageCompression(
    new File([blob], "crop.jpg", { type: "image/jpeg" }),
    { maxWidthOrHeight: 2000, maxSizeMB: 1, useWebWorker: true, fileType: "image/jpeg" },
  );

  const safeBase = baseName.replace(/\.[^.]+$/, "").trim() || "image";
  return new File([compressed], `${safeBase}.jpg`, { type: "image/jpeg" });
}
