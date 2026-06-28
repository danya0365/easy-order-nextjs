"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type {
  PosterDimensions,
  TemplateCopy,
} from "@/src/domain/services/promo-poster";
import { cn } from "@/src/presentation/components/ui/cn";
import { PosterExportArea } from "./PosterExportArea";
import { TEMPLATE_OPTIONS, type TemplateId } from "./PosterPreview";
import type { PromoSeedData } from "./types";

/** Path A — pick a ready-made design; the studio fills it with shop data + QR. */
export function TemplatePosterPanel({
  size,
  copy,
  seed,
}: {
  size: PosterDimensions;
  copy: TemplateCopy;
  seed: PromoSeedData;
}) {
  const t = useTranslations("promote");
  const [template, setTemplate] = useState<TemplateId>("classic");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t("design")}</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_OPTIONS.map((opt) => {
            const active = opt.id === template;
            const disabled = opt.id === "photo" && !seed.profileImageDataUrl;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => setTemplate(opt.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-border text-muted hover:text-foreground",
                )}
              >
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>
        {!seed.profileImageDataUrl && (
          <p className="text-xs text-muted">{t("photoNeedsProfile")}</p>
        )}
      </div>

      <PosterExportArea
        size={size}
        copy={copy}
        seed={seed}
        design={{ kind: "template", template }}
        fileName={`promote-${seed.shopName}`}
      />
    </div>
  );
}
