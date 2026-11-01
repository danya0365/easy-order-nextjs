import Link from "next/link";
import { BookOpen, LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { MenuView } from "@/src/domain/services/public-menu";
import { cn } from "@/src/presentation/components/ui/cn";

export async function MenuViewSwitch({ slug, current }: { slug: string; current: MenuView }) {
  const t = await getTranslations("publicMenu");
  const opt = (view: MenuView, label: string, icon: React.ReactNode) => (
    <Link
      href={view === "book" ? `/s/${slug}/menu?view=book` : `/s/${slug}/menu`}
      aria-current={current === view ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
        current === view ? "bg-brand-500 text-on-brand shadow-sm" : "text-muted hover:text-foreground",
      )}
      data-testid={`menu-view-${view}`}
    >
      {icon} {label}
    </Link>
  );
  return (
    <div role="group" aria-label={t("modeLabel")} className="inline-flex rounded-xl bg-card p-1 ring-1 ring-border">
      {opt("normal", t("viewNormal"), <LayoutGrid className="size-4" />)}
      {opt("book", t("viewBook"), <BookOpen className="size-4" />)}
    </div>
  );
}
