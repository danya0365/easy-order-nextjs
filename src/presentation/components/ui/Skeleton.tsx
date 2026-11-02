import type React from "react";
import { cn } from "./cn";

/** A single shimmering placeholder block. Compose these to mirror a page's layout. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn("animate-pulse rounded-md bg-muted-surface", className)}
    />
  );
}
