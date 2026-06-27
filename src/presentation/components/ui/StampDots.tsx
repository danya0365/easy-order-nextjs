import { useTranslations } from "next-intl";

import { cn } from "./cn";

interface StampDotsProps {
  current: number;
  threshold: number;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-7 w-7 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-xl",
};

/** A cute loyalty-card grid: filled stamps vs empty slots. */
export function StampDots({ current, threshold, size = "md" }: StampDotsProps) {
  const t = useTranslations("common");
  const filled = Math.max(0, Math.min(current, threshold));
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: threshold }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center rounded-full leading-none transition",
              SIZES[size],
              isFilled
                ? "bg-brand-500 text-on-brand shadow-sm ring-1 ring-brand-600/20"
                : "border border-brand-200 bg-brand-50 text-brand-200",
            )}
            aria-label={isFilled ? t("stampFilled") : t("stampEmpty")}
          >
            ★
          </div>
        );
      })}
    </div>
  );
}
