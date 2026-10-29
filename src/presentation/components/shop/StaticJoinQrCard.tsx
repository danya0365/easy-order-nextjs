"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReactToPrint } from "react-to-print";

import {
  QR_CARD_PAGE_STYLE,
  QrPrintCard,
} from "@/src/presentation/components/print/QrPrintCard";

interface Props {
  qrDataUrl: string;
  joinUrl: string;
  shopName: string;
  logoDataUrl?: string | null;
}

/** Printable static QR for `/s/[slug]/join?k=` (revocable via rotate, no expiry). */
export function StaticJoinQrCard({ qrDataUrl, joinUrl, shopName, logoDataUrl }: Props) {
  const t = useTranslations("shopPages");
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: shopName,
    pageStyle: QR_CARD_PAGE_STYLE,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6">
        <p className="text-lg font-bold text-foreground">{shopName}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from server */}
        <img src={qrDataUrl} alt={t("staticJoinQrAlt")} className="size-56" />
        <p className="text-center text-sm text-muted">{t("staticJoinQrDesc")}</p>
        <p className="break-all text-center text-xs text-muted">{joinUrl}</p>
      </div>
      <div>
        <button
          type="button"
          onClick={() => handlePrint()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-600"
        >
          <Printer className="size-4" />
          {t("staticJoinQrPrint")}
        </button>
      </div>
      {/* Print-only card: hidden on screen, cloned into react-to-print's iframe. */}
      <div style={{ display: "none" }}>
        <QrPrintCard
          ref={printRef}
          shopName={shopName}
          qrDataUrl={qrDataUrl}
          logoDataUrl={logoDataUrl}
          caption={t("staticJoinQrPrintCaption")}
          qrAlt={t("staticJoinQrAlt")}
        />
      </div>
    </div>
  );
}
