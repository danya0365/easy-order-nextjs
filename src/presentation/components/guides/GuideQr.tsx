"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

/** QR rendered client-side (no server CPU); deep-links to the guide's target page. */
export function GuideQr({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    import("qrcode").then((q) =>
      q.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then((d) => live && setSrc(d)),
    );
    return () => {
      live = false;
    };
  }, [url]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="guide-qr" className="size-32 print:size-[34mm]" />
  ) : (
    <div className="size-32 animate-pulse rounded bg-muted print:size-[34mm]" aria-hidden />
  );
}

export function GuidePrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-testid="guide-print"
      className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
