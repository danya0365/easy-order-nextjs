"use client";

import { useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  PosterDimensions,
  TemplateCopy,
} from "@/src/domain/services/promo-poster";
import { Button } from "@/src/presentation/components/ui/Button";
import {
  exportPosterPng,
  printPosterPng,
} from "@/src/presentation/lib/poster-export";
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
        <Button disabled={busy} onClick={() => run(printPosterPng)}>
          <Printer className="size-4" />
          {t("print")}
        </Button>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
