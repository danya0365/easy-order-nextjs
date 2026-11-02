import "server-only";

/** Render arbitrary text as a QR-code PNG data URL. */
export async function renderQrDataUrl(text: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, { margin: 1, width: 256 });
}
