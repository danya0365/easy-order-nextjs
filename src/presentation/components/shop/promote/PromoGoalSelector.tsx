"use client";

import { useTranslations } from "next-intl";

import {
  PROMO_GOAL_PRESETS,
  type PromoGoal,
} from "@/src/domain/services/promo-poster";
import { cn } from "@/src/presentation/components/ui/cn";

/** Chips for the promo goal — the single choice that drives copy AND AI prompt. */
export function PromoGoalSelector({
  value,
  onChange,
}: {
  value: PromoGoal;
  onChange: (goal: PromoGoal) => void;
}) {
  const t = useTranslations("promote");
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{t("goal")}</p>
      <div className="flex flex-wrap gap-2">
        {PROMO_GOAL_PRESETS.map((preset) => {
          const active = preset.goal === value;
          return (
            <button
              key={preset.goal}
              type="button"
              onClick={() => onChange(preset.goal)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {t(preset.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
