"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "./cn";

/**
 * Interactive 1–5 star picker. Renders a hidden input named `rating` so it
 * works inside a plain <form action={...}>. Hover previews the value.
 */
export function StarRatingInput({
  name = "rating",
  defaultValue = 0,
}: {
  name?: string;
  defaultValue?: number;
}) {
  const t = useTranslations("common");
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value} />
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            aria-label={t("starRatingStars", { n })}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setValue(n)}
            className="p-2"
          >
            <Star
              className={cn(
                "size-8 transition",
                n <= shown
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted hover:text-amber-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
