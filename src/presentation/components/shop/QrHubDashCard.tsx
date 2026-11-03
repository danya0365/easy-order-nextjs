"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Printer, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/src/presentation/components/ui/cn";
import { OrderQrExpiryBadge, useOrderQrStatus } from "@/src/presentation/components/shop/OrderQrExpiryBadge";

/** Dashboard shortcut to /shop/qr; turns into a warning when the printed order QR is (nearly) expired. */
export function QrHubDashCard({ shopId, orderQrOn }: { shopId: string; orderQrOn: boolean }) {
  const t = useTranslations("qrHub");
  const s = useOrderQrStatus(shopId);
  const warn = orderQrOn && !!s && (s.kind === "soon" || s.kind === "expired");
  return (
    <Link
      href="/shop/qr"
      data-testid="dash-qr-card"
      data-warn={warn ? "1" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl p-4 ring-2 transition",
        warn ? "bg-warning-surface ring-warning/50" : "bg-card ring-brand-500/40 hover:bg-brand-50",
      )}
    >
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", warn ? "bg-warning text-white" : "bg-brand-500 text-on-brand")}>
        {warn ? <AlertTriangle className="size-6" /> : <QrCode className="size-6" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-bold text-foreground">{warn ? t("dashWarnTitle") : t("dashTitle")}</span>
        <span className="text-sm text-muted">{t("dashDesc")}</span>
        {orderQrOn && <OrderQrExpiryBadge shopId={shopId} className="self-start" />}
      </span>
      <span className="hidden items-center gap-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand sm:inline-flex">
        <Printer className="size-4" /> {t("dashCta")}
      </span>
      <ChevronRight className="size-5 text-muted sm:hidden" />
    </Link>
  );
}
