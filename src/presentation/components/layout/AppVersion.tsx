import { useAppVersion } from "@/src/presentation/hooks/useAppVersion";
import { cn } from "@/src/presentation/components/ui/cn";
import { BRAND } from "@/src/config/brand";

/**
 * Subtle build-version caption. Sits at the end of a shell's content, above the
 * fixed bottom tab bar — the app's footer stand-in.
 */
export function AppVersion({ className }: { className?: string }) {
  const { displayVersion } = useAppVersion();
  return (
    <p
      className={cn(
        "pt-6 pb-2 text-center text-[11px] text-muted print:hidden",
        className,
      )}
    >
      {BRAND.name} {displayVersion}
    </p>
  );
}
