import { cn } from "./cn";

/** A single shimmering placeholder block. Compose these to mirror a page's layout. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted-surface", className)}
    />
  );
}
