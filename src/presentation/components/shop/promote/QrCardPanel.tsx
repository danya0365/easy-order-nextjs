"use client";

import { useRef, useState } from "react";
import { Check, Download, Image as ImageIcon, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReactToPrint } from "react-to-print";

import {
  QR_CARD_ACCENTS,
  QR_CARD_PAPERS,
  QrPrintCard,
  qrCardPageStyle,
  type QrCardAccent,
  type QrCardPaper,
} from "@/src/presentation/components/print/QrPrintCard";
import { QrCardPreview } from "@/src/presentation/components/print/QrCardPreview";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { cn } from "@/src/presentation/components/ui/cn";
import { exportPosterPng } from "@/src/presentation/lib/poster-export";
import type { PromoSeedData } from "./types";

/** Path: adjustable A6/A5/A4 QR card (same design as the members print card). */
export function QrCardPanel({ seed }: { seed: PromoSeedData }) {
  const t = useTranslations("promote");
  const [caption, setCaption] = useState(t("cardCaptionDefault"));
  const [subtitle, setSubtitle] = useState("");
  const [accent, setAccent] = useState<QrCardAccent>("ink");
  const [paper, setPaper] = useState<QrCardPaper>("A6");
  const [showLogo, setShowLogo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const fileName = `qr-card-${seed.shopName}`;
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: fileName,
    pageStyle: qrCardPageStyle(paper),
  });
  const card = {
    shopName: seed.shopName,
    qrDataUrl: seed.qrDataUrl,
    logoDataUrl: seed.profileImageDataUrl,
    caption: caption.trim() || t("cardCaptionDefault"),
    subtitle: subtitle.trim() || undefined,
    qrAlt: t("cardQrAlt"),
    accent,
    paper,
    showLogo,
  };

  async function download() {
    if (!previewRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await exportPosterPng(previewRef.current, fileName, { pixelRatio: 2 });
    } catch {
      setError(t("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm transition",
      active
        ? "border-brand-500 bg-brand-50 text-brand-700"
        : "border-border text-muted hover:text-foreground",
    );

  return (
    <div className="flex flex-col gap-4" data-testid="qr-card-panel">
      <div className="flex flex-col gap-2">
        <label htmlFor="cardCaption" className="text-sm font-medium text-foreground">{t("cardCaption")}</label>
        <Input id="cardCaption" value={caption} maxLength={60} onChange={(e) => setCaption(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="cardSubtitle" className="text-sm font-medium text-foreground">{t("cardSubtitle")}</label>
        <Input id="cardSubtitle" value={subtitle} maxLength={60} placeholder={t("cardSubtitlePlaceholder")} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t("cardColor")}</p>
        <div className="flex gap-2">
          {(Object.keys(QR_CARD_ACCENTS) as QrCardAccent[]).map((id) => (
            <button
              key={id}
              type="button"
              data-accent={id}
              aria-pressed={id === accent}
              aria-label={t(`cardColor_${id}`)}
              title={t(`cardColor_${id}`)}
              onClick={() => setAccent(id)}
              className={cn("flex size-9 items-center justify-center rounded-full border-2 transition", id === accent ? "border-foreground" : "border-transparent")}
              style={{ background: QR_CARD_ACCENTS[id].accent }}
            >
              {id === accent && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t("cardPaper")}</p>
        <div className="flex gap-2">
          {QR_CARD_PAPERS.map((p) => (
            <button key={p} type="button" data-paper={p} aria-pressed={p === paper} onClick={() => setPaper(p)} className={pill(p === paper)}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" data-testid="card-show-logo" checked={showLogo} disabled={!seed.profileImageDataUrl} onChange={(e) => setShowLogo(e.target.checked)} />
        <ImageIcon className="size-4" />
        {t("cardShowLogo")}
      </label>

      <div className="flex justify-center rounded-xl bg-muted-surface p-4">
        <QrCardPreview {...card} cardRef={previewRef} displayWidth={300} />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" disabled={busy} onClick={download}>
          <Download className="size-4" />
          {busy ? t("exporting") : t("downloadPng")}
        </Button>
        <Button disabled={busy} onClick={() => handlePrint()}>
          <Printer className="size-4" />
          {t("print")}
        </Button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}

      <div style={{ display: "none" }}>
        <QrPrintCard ref={printRef} {...card} />
      </div>
    </div>
  );
}
