"use client";

import { useTranslations } from "next-intl";
import { UtensilsCrossed } from "lucide-react";

/**
 * Full-screen idle/attract overlay shown when the kiosk has been untouched for a
 * while with an empty cart — invites the next walk-in to start. Any tap dismisses
 * it (the parent also clears idle on global interaction).
 */
export function AttractScreen({
  shopName,
  onDismiss,
}: {
  shopName: string;
  onDismiss: () => void;
}) {
  const t = useTranslations("kiosk");
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label={t("attractCta")}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-brand-600 px-6 text-center text-on-brand"
    >
      <UtensilsCrossed className="size-20 animate-pulse" />
      {shopName && <p className="text-3xl font-extrabold">{shopName}</p>}
      <p className="text-xl font-medium opacity-90">{t("attractCta")}</p>
    </button>
  );
}
