"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReactToPrint } from "react-to-print";

import { orderQrStorageKey } from "@/src/presentation/lib/order-qr-expiry";

interface Props {
  qrDataUrl: string;
  shopName: string;
  /** Shop id + token expiry (ms) → the print button records when this printout expires. */
  shopId?: string;
  expiresAtMs?: number;
}

/** Printable QR card for the shop's online-order claim URL (no secrets shown). */
export function OrderAccessQrCard({ qrDataUrl, shopName, shopId, expiresAtMs }: Props) {
  const t = useTranslations("shopPages");
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${shopName} — QR`,
    onAfterPrint: () => {
      if (!shopId || !expiresAtMs) return;
      try {
        window.localStorage.setItem(orderQrStorageKey(shopId), String(expiresAtMs));
        window.dispatchEvent(new Event("eo-orderqr-printed"));
      } catch {
        /* storage blocked — status just stays unknown */
      }
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={printRef}
        className="order-access-print-area flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6"
      >
        <p className="text-lg font-bold text-foreground">{shopName}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from server, printed without optimization */}
        <img src={qrDataUrl} alt={t("orderAccessQrAlt")} className="size-56" />
        <p className="text-center text-sm text-muted">
          {t("orderAccessQrDesc")}
        </p>
      </div>
      <div className="print:hidden">
        <button
          type="button"
          onClick={() => handlePrint()}
          data-testid="order-qr-print"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-base font-semibold text-on-brand transition hover:bg-brand-600"
        >
          <Printer className="size-5" />
          {t("orderAccessQrPrint")}
        </button>
      </div>
    </div>
  );
}
