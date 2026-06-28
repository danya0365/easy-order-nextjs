"use client";

/* eslint-disable @next/next/no-img-element */
import { forwardRef } from "react";

import type {
  PosterDimensions,
  TemplateCopy,
} from "@/src/domain/services/promo-poster";
import { cn } from "@/src/presentation/components/ui/cn";
import { PosterCtaLayer } from "./PosterCtaLayer";
import type { PromoSeedData } from "./types";

/** Ready-made background designs for path A (theme-token colored, no hex). */
export type TemplateId = "classic" | "photo" | "minimal";

/** `labelKey` is a `promote`-namespace message key (resolved by the consumer). */
export const TEMPLATE_OPTIONS: {
  id: TemplateId;
  labelKey: "templateClassic" | "templatePhoto" | "templateMinimal";
}[] = [
  { id: "classic", labelKey: "templateClassic" },
  { id: "photo", labelKey: "templatePhoto" },
  { id: "minimal", labelKey: "templateMinimal" },
];

export type PosterDesign =
  | { kind: "template"; template: TemplateId }
  | { kind: "image"; src: string };

/** Full-bleed background behind the CTA panel, chosen by the active design. */
function PosterBackground({
  design,
  seed,
}: {
  design: PosterDesign;
  seed: PromoSeedData;
}) {
  if (design.kind === "image") {
    return (
      <img
        src={design.src}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  if (design.template === "photo" && seed.profileImageDataUrl) {
    return (
      <div className="absolute inset-0 flex flex-col">
        <img
          src={seed.profileImageDataUrl}
          alt=""
          className="h-1/2 w-full object-cover"
        />
        <div className="flex-1 bg-linear-to-b from-brand-500 to-accent-500" />
      </div>
    );
  }
  if (design.template === "minimal") {
    return <div className="absolute inset-0 bg-background" />;
  }
  // classic (and photo fallback when no profile image)
  return (
    <div className="absolute inset-0 bg-linear-to-br from-brand-400 to-accent-500" />
  );
}

/**
 * The poster as a real DOM node laid out at its TRUE export pixel size, then
 * visually shrunk to `displayWidth` via a CSS transform on the wrapper (which
 * html-to-image ignores → it captures the node at full size). The forwarded ref
 * points at the full-size node so `exportPosterPng` can snapshot it.
 */
export const PosterPreview = forwardRef<
  HTMLDivElement,
  {
    size: PosterDimensions;
    copy: TemplateCopy;
    seed: PromoSeedData;
    design: PosterDesign;
    displayWidth: number;
  }
>(function PosterPreview({ size, copy, seed, design, displayWidth }, ref) {
  const scale = displayWidth / size.w;

  return (
    // Outer box occupies the on-screen (scaled) footprint and clips overflow.
    <div
      className="overflow-hidden rounded-xl ring-1 ring-border"
      style={{ width: displayWidth, height: size.h * scale }}
    >
      {/* Scaler: shrinks the full-size node for display only. NOT captured — */}
      {/* html-to-image snapshots the ref'd child below at its true pixel size. */}
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div
          ref={ref}
          className="relative overflow-hidden"
          style={{ width: size.w, height: size.h }}
        >
          <PosterBackground design={design} seed={seed} />
          {/* CTA panel anchored to the lower area, leaving the top for imagery. */}
          <div
            className={cn("absolute inset-x-0 bottom-0 flex justify-center")}
            style={{ padding: 56 }}
          >
            <PosterCtaLayer copy={copy} seed={seed} scale={1} />
          </div>
        </div>
      </div>
    </div>
  );
});
