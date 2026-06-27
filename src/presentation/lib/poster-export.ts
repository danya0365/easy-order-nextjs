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
async function renderPosterPng(node: HTMLElement, pixelRatio = 1): Promise<string> {
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

/**
 * Print just the poster image via a hidden iframe (avoids popup blockers and
 * the surrounding page chrome). The iframe is removed after printing.
 */
export async function printPosterPng(node: HTMLElement): Promise<void> {
  const dataUrl = await renderPosterPng(node);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><style>@page{margin:0}body{margin:0}img{width:100%;display:block}</style></head><body><img src="${dataUrl}"></body></html>`,
  );
  doc.close();

  const img = doc.querySelector("img");
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  const run = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    cleanup();
  };
  if (img && !img.complete) {
    img.addEventListener("load", run, { once: true });
  } else {
    run();
  }
}
