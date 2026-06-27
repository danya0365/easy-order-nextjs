"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/src/presentation/components/ui/cn";

/**
 * Placeholder shown while a maplibre map chunk lazy-loads. A named client
 * component (not an inline arrow) so `next/dynamic`'s `loading` option can use
 * the `useTranslations` hook.
 */
export function MapLoading({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center bg-muted-surface text-sm text-muted",
        className ?? "h-full",
      )}
    >
      {t("mapLoading")}
    </div>
  );
}
