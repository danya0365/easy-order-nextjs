/* eslint-disable @next/next/no-img-element */
import { getTranslations } from "next-intl/server";

import { satangToBaht } from "@/src/presentation/lib/money";

/**
 * Presentational PromptPay QR card. Receives a pre-rendered QR image URL (data
 * URL or remote) + display info — the EMVCo payload + image are produced in the
 * billing layer (Step 4). Kept dumb so storage/generation can change freely.
 */
export async function PromptPayQR({
  qrImageUrl,
  amountSatang,
  target,
}: {
  qrImageUrl: string;
  amountSatang: number;
  target: string;
}) {
  const t = await getTranslations("billing");
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100">
      <span className="text-sm font-medium text-brand-700">
        {t("scanToPay")}
      </span>
      <img
        src={qrImageUrl}
        alt="PromptPay QR"
        width={208}
        height={208}
        className="h-52 w-52 rounded-xl bg-card object-contain p-2 shadow-sm"
      />
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">
          ฿{satangToBaht(amountSatang)}
        </p>
        <p className="text-xs text-muted">{t("promptpayTarget", { target })}</p>
      </div>
    </div>
  );
}
