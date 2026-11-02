"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { pickFitScale } from "@/src/domain/services/compact-menu";

const MM_PX = 96 / 25.4;

/**
 * Auto-fit wrapper for the compact menu sheet: measures the server-rendered
 * content at each type scale (CSS var --fit) and keeps the largest one that
 * fits one sheet (else two). On screen the true-size sheet is scaled down to
 * the viewport; on paper the transform is removed by print CSS.
 */
export function CompactFit({
  pageWidthMm,
  pageHeightMm,
  children,
}: {
  pageWidthMm: number;
  pageHeightMm: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("publicMenu");
  const sheetRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; sheets: number } | null>(null);
  const [view, setView] = useState(1);

  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const pageH = pageHeightMm * MM_PX;
    const measure = (s: number) => {
      el.style.setProperty("--fit", String(s));
      return el.scrollHeight;
    };
    const run = () => {
      const r = pickFitScale(measure, pageH);
      el.style.setProperty("--fit", String(r.scale));
      el.dataset.sheets = String(r.sheets);
      setFit(r);
    };
    run();
    // Images/fonts change heights after load → refit once they settle.
    document.fonts?.ready.then(run).catch(() => {});
    const imgs = Array.from(el.querySelectorAll("img"));
    imgs.forEach((i) => i.complete || i.addEventListener("load", run, { once: true }));
  }, [pageHeightMm]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setView(Math.min(1, box.clientWidth / (pageWidthMm * MM_PX)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [pageWidthMm]);

  const sheets = fit?.sheets ?? 1;
  return (
    <div ref={boxRef} className="compact-preview" data-testid="compact-preview">
      <p className="mb-2 text-center text-xs font-semibold text-muted print:hidden" data-testid="compact-fit-info">
        {fit ? t("fitInfo", { sheets, pct: Math.round(fit.scale * 100) }) : t("fitting")}
      </p>
      <div
        className="compact-scaler"
        // runtime preview scale + reserved height for the scaled sheet(s)
        style={{
          width: `${pageWidthMm * MM_PX * view}px`,
          height: `${pageHeightMm * MM_PX * sheets * view}px`,
        }}
      >
        <div
          ref={sheetRef}
          className="compact-sheet"
          style={{
            width: `${pageWidthMm}mm`,
            minHeight: `${pageHeightMm * sheets}mm`,
            transform: `scale(${view})`,
            ["--page-h" as string]: `${pageHeightMm}mm`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
