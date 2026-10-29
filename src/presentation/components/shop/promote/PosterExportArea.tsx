"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReactToPrint } from "react-to-print";

import type {
  PosterDimensions,
  TemplateCopy,
} from "@/src/domain/services/promo-poster";
import { Button } from "@/src/presentation/components/ui/Button";
import {
  exportPosterPng,
  renderPosterPng,
} from "@/src/presentation/lib/poster-export";
import { POSTER_PAGE_STYLE } from "@/src/presentation/components/print/QrPrintCard";
import { PosterPreview, type PosterDesign } from "./PosterPreview";
import type { PromoSeedData } from "./types";

/** On-screen preview width (CSS px). The node renders full-size behind a scale. */
const DISPLAY_WIDTH = 320;

/**
 * Shared preview + Download/Print controls used by both the template path (A)
 * and the upload path (C) — they differ only in the poster background `design`.
 */
export function PosterExportArea({
  size,
  copy,
  seed,
  design,
  fileName,
}: {
  size: PosterDimensions;
  copy: TemplateCopy;
  seed: PromoSeedData;
  design: PosterDesign;
  fileName: string;
}) {
  const t = useTranslations("promote");
  const nodeRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Print path: rasterize the poster node → show it in a hidden print-only
  // element → react-to-print prints ONLY that element (never the whole page).
  const printRef = useRef<HTMLDivElement>(null);
  const [printSrc, setPrintSrc] = useState<string | null>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: fileName,
    pageStyle: POSTER_PAGE_STYLE,
    onAfterPrint: () => setPrintSrc(null),
  });
  useEffect(() => {
    if (printSrc) handlePrint();
  }, [printSrc, handlePrint]);

  async function run(action: (node: HTMLElement) => Promise<void>) {
    if (!nodeRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await action(nodeRef.current);
    } catch {
      setError(t("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <PosterPreview
        ref={nodeRef}
        size={size}
        copy={copy}
        seed={seed}
        design={design}
        displayWidth={DISPLAY_WIDTH}
      />

      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => run((n) => exportPosterPng(n, fileName))}
        >
          <Download className="size-4" />
          {busy ? t("exporting") : t("downloadPng")}
        </Button>
        <Button disabled={busy} onClick={() =>
            run(async (n) => setPrintSrc(await renderPosterPng(n)))
          }>
          <Printer className="size-4" />
          {t("print")}
        </Button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div style={{ display: "none" }}>
        <div ref={printRef} data-testid="poster-print-sheet">
          {printSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL
            <img
              src={printSrc}
              alt=""
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
