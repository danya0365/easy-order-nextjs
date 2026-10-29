"use client";

import type { Ref } from "react";

export type QrCardPaper = "A6" | "A5" | "A4";
export const QR_CARD_PAPERS: QrCardPaper[] = ["A6", "A5", "A4"];

/** Accent presets (ink color for name/caption + frame tint). */
export const QR_CARD_ACCENTS = {
  ink: { accent: "#18181b", soft: "#f4f4f5" },
  orange: { accent: "#ea580c", soft: "#fff7ed" },
  green: { accent: "#16a34a", soft: "#f0fdf4" },
  blue: { accent: "#2563eb", soft: "#eff6ff" },
  rose: { accent: "#e11d48", soft: "#fff1f2" },
} as const;
export type QrCardAccent = keyof typeof QR_CARD_ACCENTS;

/** Card width/height (mm) per paper: sheet minus 8mm margins. */
const PAPER_MM: Record<QrCardPaper, { w: number; h: number; scale: number }> = {
  A6: { w: 89, h: 132, scale: 1 },
  A5: { w: 132, h: 194, scale: 1.45 },
  A4: { w: 194, h: 281, scale: 2.1 },
};
export function qrCardSizeMm(paper: QrCardPaper) {
  return PAPER_MM[paper];
}

/** react-to-print page style for one card per sheet of the chosen paper. */
export function qrCardPageStyle(paper: QrCardPaper = "A6") {
  return `
  @page { size: ${paper} portrait; margin: 8mm; }
  @media print {
    html, body { margin: 0; padding: 0; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
}
export const QR_CARD_PAGE_STYLE = qrCardPageStyle("A6");

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
  subtitle?: string;
  accent?: QrCardAccent;
  paper?: QrCardPaper;
  showLogo?: boolean;
}

/**
 * QR card (shop name/logo, large QR, caption). Never contains the URL or
 * token as text. Inline mm styles so screen preview, PNG and print match.
 */
export function QrPrintCard({
  ref,
  shopName,
  qrDataUrl,
  caption,
  qrAlt,
  logoDataUrl,
  subtitle,
  accent = "ink",
  paper = "A6",
  showLogo = true,
}: Props) {
  const { w, h, scale: s } = PAPER_MM[paper];
  const c = QR_CARD_ACCENTS[accent] ?? QR_CARD_ACCENTS.ink;
  const mm = (n: number) => `${n * s}mm`;
  return (
    <div
      ref={ref}
      data-testid="qr-print-card"
      data-paper={paper}
      data-accent={accent}
      style={{
        boxSizing: "border-box",
        width: `${w}mm`,
        height: `${h}mm`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: mm(4),
        padding: mm(7),
        border: `${mm(1.2)} solid ${c.accent}`,
        borderRadius: mm(5),
        background: "#fff",
        color: "#18181b",
        fontFamily: "inherit",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {showLogo && logoDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL
        <img
          src={logoDataUrl}
          alt=""
          style={{
            width: mm(16),
            height: mm(16),
            borderRadius: "50%",
            objectFit: "cover",
            border: `${mm(0.6)} solid ${c.accent}`,
          }}
        />
      )}
      <p style={{ margin: 0, fontSize: `${18 * s}pt`, fontWeight: 700, lineHeight: 1.2, color: c.accent }}>
        {shopName}
      </p>
      {subtitle && (
        <p data-testid="qr-card-subtitle" style={{ margin: 0, fontSize: `${11 * s}pt`, lineHeight: 1.3, color: "#52525b" }}>
          {subtitle}
        </p>
      )}
      <div style={{ padding: mm(3), borderRadius: mm(4), background: c.soft }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
        <img
          src={qrDataUrl}
          alt={qrAlt}
          style={{ display: "block", width: mm(62), height: mm(62), objectFit: "contain", background: "#fff", borderRadius: mm(2) }}
        />
      </div>
      <p data-testid="qr-card-caption" style={{ margin: 0, fontSize: `${14 * s}pt`, fontWeight: 600, lineHeight: 1.3, color: c.accent }}>
        {caption}
      </p>
    </div>
  );
}
