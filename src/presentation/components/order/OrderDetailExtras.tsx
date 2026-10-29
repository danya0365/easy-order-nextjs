"use client";

import Link from "next/link";
import { Copy, Phone, Printer, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/src/presentation/components/ui/Toast";

/** Print / copy / call / open-customer actions for the shop order detail page. */
export function OrderDetailExtras({
  summary,
  phone,
  customerHref,
}: {
  summary: string;
  phone: string | null;
  customerHref: string | null;
}) {
  const t = useTranslations("customerDetail");
  const toast = useToast();
  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted-surface";
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" className={btn} onClick={() => window.print()}>
        <Printer className="size-4" /> {t("print")}
      </button>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(summary);
            toast.success(t("copied"));
          } catch {
            toast.error("copy failed");
          }
        }}
      >
        <Copy className="size-4" /> {t("copy")}
      </button>
      {phone && (
        <a className={btn} href={`tel:${phone}`}>
          <Phone className="size-4" /> {t("callCustomer")}
        </a>
      )}
      {customerHref && (
        <Link className={btn} href={customerHref}>
          <UserRound className="size-4" /> {t("openCustomer")}
        </Link>
      )}
    </div>
  );
}
