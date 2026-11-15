import Link from "next/link";
import { MapPin } from "lucide-react";

import { cn } from "@/src/presentation/components/ui/cn";

/**
 * Owner branch filter (server-rendered links → `?branch=<id>`; "all" clears).
 * Rendered only for multi-branch shops.
 */
export function BranchFilterChips({
  basePath,
  branches,
  selected,
  allLabel,
  extraQuery = "",
}: {
  basePath: string;
  branches: { id: string; name: string }[];
  selected: string | null;
  allLabel: string;
  /** Extra query string to keep (e.g. "days=7"), without leading "&". */
  extraQuery?: string;
}) {
  if (branches.length < 2) return null;
  const href = (id: string | null) => {
    const q = [id ? `branch=${encodeURIComponent(id)}` : "", extraQuery]
      .filter(Boolean)
      .join("&");
    return q ? `${basePath}?${q}` : basePath;
  };
  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
      active
        ? "bg-brand-500 text-on-brand"
        : "bg-muted-surface text-muted hover:text-foreground",
    );
  return (
    <nav className="flex flex-wrap gap-1.5" data-testid="branch-filter">
      <Link href={href(null)} className={chip(!selected)} data-testid="branch-filter-all">
        {allLabel}
      </Link>
      {branches.map((b) => (
        <Link
          key={b.id}
          href={href(b.id)}
          className={chip(selected === b.id)}
          data-testid="branch-filter-option"
        >
          <MapPin className="size-3.5" />
          {b.name}
        </Link>
      ))}
    </nav>
  );
}
