"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  qrDataUrl: string;
  shopName: string;
}

/** Printable permanent Static QR for `/s/[slug]/join` (no expiring token). */
export function StaticJoinQrCard({ qrDataUrl, shopName }: Props) {
  const t = useTranslations("shopPages");

  return (
    <div className="flex flex-col gap-3">
      <div className="static-join-print-area flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6">
        <p className="text-lg font-bold text-foreground">{shopName}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from server */}
        <img src={qrDataUrl} alt={t("staticJoinQrAlt")} className="size-56" />
        <p className="text-center text-sm text-muted">{t("staticJoinQrDesc")}</p>
      </div>
      <div className="print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-600"
        >
          <Printer className="size-4" />
          {t("staticJoinQrPrint")}
        </button>
      </div>
    </div>
  );
}
