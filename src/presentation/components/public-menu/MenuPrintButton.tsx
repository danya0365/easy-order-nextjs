"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

/** window.print() — the print stylesheet swaps the screen UI for the A4 menu book. */
export function MenuPrintButton() {
  const t = useTranslations("publicMenu");
  return (
    <button
      type="button"
      onClick={() => window.print()}
      title={t("printHint")}
      className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-muted-surface"
      data-testid="menu-print"
    >
      <Printer className="size-4" /> {t("print")}
    </button>
  );
}
