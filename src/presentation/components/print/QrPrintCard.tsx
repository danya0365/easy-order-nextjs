"use client";

import type { Ref } from "react";

/** Card-sized page for react-to-print: one centered card per A6 sheet. */
export const QR_CARD_PAGE_STYLE = `
  @page { size: A6 portrait; margin: 8mm; }
  @media print {
    html, body { margin: 0; padding: 0; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

/** Full-bleed page for printing a rasterized poster image. */
export const POSTER_PAGE_STYLE = `
  @page { size: auto; margin: 6mm; }
  @media print {
    html, body { margin: 0; padding: 0; background: #fff; }
  }
`;

interface Props {
  ref?: Ref<HTMLDivElement>;
  shopName: string;
  qrDataUrl: string;
  caption: string;
  qrAlt: string;
  logoDataUrl?: string | null;
}

/**
 * Print-only QR card (shop name/logo, large QR, caption). Never contains the
 * URL or token as text. Mount it inside a hidden wrapper and print it with
 * `useReactToPrint({ contentRef })`. Inline styles so it renders the same in
 * the print iframe regardless of app CSS/theme.
 */
export function QrPrintCard({
  ref,
  shopName,
  qrDataUrl,
  caption,
  qrAlt,
  logoDataUrl,
}: Props) {
  return (
    <div
      ref={ref}
      data-testid="qr-print-card"
      style={{
        boxSizing: "border-box",
        width: "100%",
        minHeight: "120mm",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "5mm",
        padding: "8mm",
        border: "0.4mm solid #d4d4d8",
        borderRadius: "5mm",
        background: "#fff",
        color: "#18181b",
        fontFamily: "inherit",
        textAlign: "center",
      }}
    >
      {logoDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL
        <img
          src={logoDataUrl}
          alt=""
          style={{ width: "16mm", height: "16mm", borderRadius: "50%", objectFit: "cover" }}
        />
      )}
      <p style={{ margin: 0, fontSize: "18pt", fontWeight: 700, lineHeight: 1.2 }}>
        {shopName}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
      <img
        src={qrDataUrl}
        alt={qrAlt}
        style={{ width: "70mm", height: "70mm", objectFit: "contain" }}
      />
      <p style={{ margin: 0, fontSize: "14pt", fontWeight: 600, lineHeight: 1.3 }}>
        {caption}
      </p>
    </div>
  );
}
