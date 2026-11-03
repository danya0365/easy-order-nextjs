import { ThemeSwitcher } from "@/src/presentation/components/ThemeSwitcher";
import { cn } from "@/src/presentation/components/ui/cn";

/**
 * The one top bar for every area (home/public, per-shop customer PWA, shop,
 * staff, admin, rider). Left = logo / shop identity, right = area-specific
 * `actions`, then the skin switcher (always present: Palette popover on
 * mobile, pill on sm+), then optional `trailing` (e.g. logout).
 * Server-renderable; only ThemeSwitcher is a client island. Skin is stored
 * in this browser only (theme-storage) — it never touches shop settings.
 */
export function SiteHeader({
  left,
  actions,
  trailing,
  width = "max-w-5xl",
  sticky = false,
  themeLabels = true,
  className,
}: {
  left: React.ReactNode;
  actions?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Inner container width (matches the area's content column). */
  width?: string;
  sticky?: boolean;
  /** Show text labels in the desktop pill (off for narrow shells). */
  themeLabels?: boolean;
  className?: string;
}) {
  return (
    <header
      data-site-header
      className={cn(
        "border-b border-border bg-card print:hidden",
        sticky && "sticky top-0 z-30 bg-card/95 backdrop-blur",
        className,
      )}
    >
      <div className={cn("mx-auto flex min-h-14 items-center gap-3 px-4 py-2", width)}>
        <div className="flex min-w-0 flex-1 items-center gap-2">{left}</div>
        <div className="flex shrink-0 items-center gap-1.5 text-sm sm:gap-2.5">
          {actions}
          <ThemeSwitcher labels={themeLabels} />
          {trailing}
        </div>
      </div>
    </header>
  );
}

/** Square icon link used in header action slots. */
export const HEADER_ICON_BTN =
  "relative inline-flex size-9 items-center justify-center rounded-lg text-foreground transition hover:bg-muted-surface";
