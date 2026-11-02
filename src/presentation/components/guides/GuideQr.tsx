"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

/** QR rendered client-side (no server CPU); deep-links to the guide's target page. */
export function GuideQr({ url, alt, size = "md" }: { url: string; alt: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-56 print:size-[62mm]" : "size-32 print:size-[34mm]";
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    import("qrcode").then((q) =>
      q.toDataURL(url, { margin: 1, width: size === "lg" ? 720 : 360, errorCorrectionLevel: "M" }).then((d) => live && setSrc(d)),
    );
    return () => {
      live = false;
    };
  }, [url, size]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="guide-qr" className={cls} />
  ) : (
    <div data-qr-pending className={`${cls} animate-pulse rounded bg-muted`} aria-hidden />
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

/** `?print=1` from the guide list: open the print dialog once the QR + screenshots have loaded. */
export function GuideAutoPrint() {
  useEffect(() => {
    let done = false;
    const tick = window.setInterval(() => {
      if (done) return;
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("#guide-sheet img"));
      const qrReady = !document.querySelector("#guide-sheet [data-qr-pending]");
      if (qrReady && imgs.every((i) => i.complete)) {
        done = true;
        window.clearInterval(tick);
        window.print();
      }
    }, 300);
    return () => window.clearInterval(tick);
  }, []);
  return null;
}
