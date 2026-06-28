"use client";

import { useTranslations } from "next-intl";

import { POSTER_SIZES, type PosterSize } from "@/src/domain/services/promo-poster";
import { cn } from "@/src/presentation/components/ui/cn";

/** Chips for the export size/aspect, shared across all three paths. */
export function PosterSizeSwitcher({
  value,
  onChange,
}: {
  value: PosterSize;
  onChange: (size: PosterSize) => void;
}) {
  const t = useTranslations("promote");
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{t("size")}</p>
      <div className="flex flex-wrap gap-2">
        {POSTER_SIZES.map((size) => {
          const active = size.id === value;
          return (
            <button
              key={size.id}
              type="button"
              onClick={() => onChange(size.id)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {t(size.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
