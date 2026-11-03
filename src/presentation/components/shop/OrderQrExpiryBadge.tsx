"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/src/presentation/components/ui/cn";
import {
  orderQrStatus,
  orderQrStorageKey,
  type OrderQrStatus,
} from "@/src/presentation/lib/order-qr-expiry";

/** Reads the printed order-QR expiry this device recorded (see order-qr-expiry.ts). */
export function useOrderQrStatus(shopId: string): OrderQrStatus | null {
  const [status, setStatus] = useState<OrderQrStatus | null>(null);
  useEffect(() => {
    const read = () => {
      const raw = window.localStorage.getItem(orderQrStorageKey(shopId));
      setStatus(orderQrStatus(raw ? Number(raw) : null, Date.now()));
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("eo-orderqr-printed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("eo-orderqr-printed", read);
    };
  }, [shopId]);
  return status;
}

export function OrderQrExpiryBadge({ shopId, className }: { shopId: string; className?: string }) {
  const t = useTranslations("qrHub");
  const s = useOrderQrStatus(shopId);
  if (!s) return <span className={cn("inline-block h-6 w-40 animate-pulse rounded-full bg-border", className)} />;
  const tone =
    s.kind === "ok"
      ? "bg-success-surface text-success"
      : s.kind === "unknown"
        ? "bg-card text-muted ring-1 ring-border"
        : s.kind === "soon"
          ? "bg-warning-surface text-warning"
          : "bg-error-surface text-error";
  const Icon = s.kind === "ok" ? CheckCircle2 : s.kind === "unknown" ? HelpCircle : AlertTriangle;
  const label =
    s.kind === "unknown"
      ? t("expiryUnknown")
      : s.kind === "expired"
        ? t("expiryExpired")
        : s.kind === "soon"
          ? t("expirySoon", { days: s.days })
          : t("expiryOk", { days: s.days });
  return (
    <span
      data-testid="order-qr-expiry"
      data-kind={s.kind}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", tone, className)}
    >
      <Icon className="size-3.5" /> {label}
    </span>
  );
}
