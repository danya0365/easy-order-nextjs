"use client";

import { useTranslations } from "next-intl";
import type { StampTypeProgress } from "@/src/domain/entities";
import { cn } from "@/src/presentation/components/ui/cn";

export function CardBalance({
  types,
  compact = false,
}: {
  types: StampTypeProgress[];
  compact?: boolean;
}) {
  const t = useTranslations("loyalty");
  if (types.length === 0) {
    return <p className="text-sm text-muted">{t("noStampTypes")}</p>;
  }
  return (
    <div className="space-y-4">
      {types.map((p) => (
        <div key={p.type.id} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium text-foreground">{p.type.name}</p>
            <p className="text-xs text-muted">
              {p.currentStamps}/{p.type.threshold}
              {p.eligibleToRedeem ? ` · ${t("readyToRedeem")}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: p.type.threshold }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-6 rounded-full border-2",
                  i < p.currentStamps
                    ? "border-brand-500 bg-brand-500"
                    : "border-border bg-card",
                  compact && "size-4",
                )}
                aria-hidden
              />
            ))}
          </div>
          {p.type.rewardText && (
            <p className="text-xs text-muted">
              {t("rewardLabel")}: {p.type.rewardText}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
