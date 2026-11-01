"use client";

import { useRef, useState } from "react";
import { BookOpen, Check, Download, Image as ImageIcon, LayoutGrid, Link2, Printer, QrCode } from "lucide-react";
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

export interface MenuQrSeed {
  shopName: string;
  logoDataUrl: string | null;
  normal: { url: string; qrDataUrl: string };
  book: { url: string; qrDataUrl: string };
}

/**
 * Static "QR เมนู" print card — same A6/A5/A4 card design as the promote QR
 * card, but it encodes the PLAIN public menu URL (no token, read-only). It can
 * never grant ordering; that still needs the HMAC order-access QR.
 */
export function MenuQrCardPanel({ seed }: { seed: MenuQrSeed }) {
  const t = useTranslations("publicMenu");
  const tp = useTranslations("promote");
  const [view, setView] = useState<"normal" | "book">("normal");
  const [caption, setCaption] = useState(t("qrCaptionDefault"));
  const [subtitle, setSubtitle] = useState("");
  const [accent, setAccent] = useState<QrCardAccent>("ink");
  const [paper, setPaper] = useState<QrCardPaper>("A6");
  const [showLogo, setShowLogo] = useState(true);
  const [showLink, setShowLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const target = seed[view];
  const fileName = `menu-qr-${seed.shopName}`;
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: fileName,
    pageStyle: qrCardPageStyle(paper),
  });
  const card = {
    shopName: seed.shopName,
    qrDataUrl: target.qrDataUrl,
    logoDataUrl: seed.logoDataUrl,
    caption: caption.trim() || t("qrCaptionDefault"),
    subtitle: subtitle.trim() || undefined,
    qrAlt: t("qrAlt"),
    accent,
    paper,
    showLogo,
    linkText: showLink ? target.url.replace(/^https?:\/\//, "") : undefined,
  };

  async function download() {
    if (!previewRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await exportPosterPng(previewRef.current, fileName, { pixelRatio: 2 });
    } catch {
      setError(tp("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  const pill = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
      active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border text-muted hover:text-foreground",
    );

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-border" data-testid="menu-qr-panel">
      <div>
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <QrCode className="size-5 text-brand-600" /> {t("qrTitle")}
        </h2>
        <p className="mt-0.5 text-sm text-muted">{t("qrDesc")}</p>
        <p className="mt-2 rounded-lg bg-warning-surface px-3 py-2 text-xs text-warning" data-testid="menu-qr-distinct">
          {t("qrDistinct")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{t("qrOpens")}</p>
            <div className="flex gap-2">
              <button type="button" data-view="normal" aria-pressed={view === "normal"} onClick={() => setView("normal")} className={pill(view === "normal")}>
                <LayoutGrid className="size-4" /> {t("viewNormal")}
              </button>
              <button type="button" data-view="book" aria-pressed={view === "book"} onClick={() => setView("book")} className={pill(view === "book")}>
                <BookOpen className="size-4" /> {t("viewBook")}
              </button>
            </div>
            <p className="break-all text-xs text-muted" data-testid="menu-qr-url">{target.url}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="menuQrCaption" className="text-sm font-medium text-foreground">{tp("cardCaption")}</label>
            <Input id="menuQrCaption" value={caption} maxLength={60} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="menuQrSubtitle" className="text-sm font-medium text-foreground">{tp("cardSubtitle")}</label>
            <Input id="menuQrSubtitle" value={subtitle} maxLength={60} placeholder={tp("cardSubtitlePlaceholder")} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{tp("cardColor")}</p>
            <div className="flex gap-2">
              {(Object.keys(QR_CARD_ACCENTS) as QrCardAccent[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  data-accent={id}
                  aria-pressed={id === accent}
                  aria-label={tp(`cardColor_${id}`)}
                  title={tp(`cardColor_${id}`)}
                  onClick={() => setAccent(id)}
                  className={cn("flex size-9 items-center justify-center rounded-full border-2 transition", id === accent ? "border-foreground" : "border-transparent")}
                  // accent swatch colors come from the shared QR card palette
                  style={{ background: QR_CARD_ACCENTS[id].accent }}
                >
                  {id === accent && <Check className="size-4 text-on-brand" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{tp("cardPaper")}</p>
            <div className="flex gap-2">
              {QR_CARD_PAPERS.map((p) => (
                <button key={p} type="button" data-paper={p} aria-pressed={p === paper} onClick={() => setPaper(p)} className={pill(p === paper)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={showLogo} disabled={!seed.logoDataUrl} onChange={(e) => setShowLogo(e.target.checked)} />
            <ImageIcon className="size-4" /> {tp("cardShowLogo")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" data-testid="menu-qr-show-link" checked={showLink} onChange={(e) => setShowLink(e.target.checked)} />
            <Link2 className="size-4" /> {t("qrShowLink")}
          </label>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex w-full justify-center rounded-xl bg-muted-surface p-4">
            <QrCardPreview {...card} cardRef={previewRef} displayWidth={300} />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" disabled={busy} onClick={download}>
              <Download className="size-4" /> {busy ? tp("exporting") : tp("downloadPng")}
            </Button>
            <Button disabled={busy} onClick={() => handlePrint()} data-testid="menu-qr-print">
              <Printer className="size-4" /> {tp("print")}
            </Button>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      </div>

      <div style={{ display: "none" }}>
        <QrPrintCard ref={printRef} {...card} />
      </div>
    </section>
  );
}
