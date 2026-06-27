import { useTranslations } from "next-intl";

import { cn } from "./cn";

export function Spinner({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <span
      role="status"
      aria-label={t("spinnerLabel")}
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
