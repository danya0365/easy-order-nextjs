/* eslint-disable @next/next/no-img-element */

import { BRAND } from "@/src/config/brand";

/**
 * Brand logo. `mark` = the square stamp-card mark (compact, for headers/tiles);
 * `wordmark` = the horizontal brand lockup (for the login/hero). The source
 * images have an opaque light background, so callers place them on a
 * light/rounded tile to look intentional in dark mode.
 */
export function Logo({
  variant = "mark",
  className,
  alt = BRAND.name,
}: {
  variant?: "mark" | "wordmark";
  className?: string;
  alt?: string;
}) {
  const src =
    variant === "wordmark" ? BRAND.assets.logoWordmark : BRAND.assets.logoMark;
  return <img src={src} alt={alt} className={className} />;
}
