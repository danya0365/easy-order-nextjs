import "server-only";

import QRCode from "qrcode";

/** Render arbitrary text as a QR-code PNG data URL. */
export function renderQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 256 });
}
