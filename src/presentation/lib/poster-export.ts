/**
 * Client-side poster → PNG export + print.
 *
 * The `PosterPreview` node is laid out at its TRUE export pixel size (e.g.
 * 1080×1080) and only visually shrunk for the screen via a CSS transform on a
 * wrapper — which html-to-image ignores, capturing the node at its real size.
 * So we snapshot at `pixelRatio: 1` and get exactly the target dimensions, with
 * the live theme CSS vars and already-loaded Thai fonts baked in. No
 * server-side rendering or font embedding needed.
 */
import { toPng } from "html-to-image";

/** Snapshot a full-size poster node to a PNG data URL. */
export async function renderPosterPng(node: HTMLElement, pixelRatio = 1): Promise<string> {
  // Avoid fallback glyphs: wait for the Thai web fonts before rasterizing.
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  return toPng(node, { pixelRatio, cacheBust: true });
}

/**
 * Render the node and trigger a PNG download (mirrors ShopQrPoster).
 * Poster previews render at true size → keep `pixelRatio: 1`; a regular DOM card
 * (e.g. the handoff card) renders small → pass `pixelRatio: 2` for crisp text.
 */
export async function exportPosterPng(
  node: HTMLElement,
  fileName: string,
  opts?: { pixelRatio?: number },
): Promise<void> {
  const dataUrl = await renderPosterPng(node, opts?.pixelRatio ?? 1);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${fileName}.png`;
  a.click();
}
