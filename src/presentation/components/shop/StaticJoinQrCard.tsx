"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReactToPrint } from "react-to-print";

import {
  QR_CARD_PAGE_STYLE,
  QrPrintCard,
} from "@/src/presentation/components/print/QrPrintCard";
import { QrCardPreview } from "@/src/presentation/components/print/QrCardPreview";

interface Props {
  qrDataUrl: string;
  shopName: string;
  logoDataUrl?: string | null;
}

/** Printable static QR (revocable via rotate). Never shows the join URL/token as text. */
export function StaticJoinQrCard({ qrDataUrl, shopName, logoDataUrl }: Props) {
  const t = useTranslations("shopPages");
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: shopName,
    pageStyle: QR_CARD_PAGE_STYLE,
  });
  const card = {
    shopName,
    qrDataUrl,
    logoDataUrl,
    caption: t("staticJoinQrPrintCaption"),
    qrAlt: t("staticJoinQrAlt"),
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full justify-center rounded-xl bg-muted-surface p-4">
        <QrCardPreview {...card} displayWidth={280} />
      </div>
      <p className="text-center text-sm text-muted">{t("staticJoinQrDesc")}</p>
      <button
        type="button"
        onClick={() => handlePrint()}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-600"
      >
        <Printer className="size-4" />
        {t("staticJoinQrPrint")}
      </button>
      <div style={{ display: "none" }}>
        <QrPrintCard ref={printRef} {...card} />
      </div>
    </div>
  );
}
