import { Star, StarHalf } from "lucide-react";
import { cn } from "./cn";

const SIZES = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-7",
} as const;

/**
 * Read-only star display for a 0–5 rating (supports halves). Empty stars are
 * outlined; filled/half use the amber fill.
 */
export function StarRating({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const cls = SIZES[size];
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        if (half) {
          return (
            <StarHalf
              key={i}
              className={cn(cls, "fill-amber-400 text-amber-400")}
            />
          );
        }
        return (
          <Star
            key={i}
            className={cn(
              cls,
              full ? "fill-amber-400 text-amber-400" : "text-muted",
            )}
          />
        );
      })}
    </div>
  );
}
