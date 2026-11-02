"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  flattenSections,
  menuListHref,
  groupByCategory,
  type PublicMenuSection,
} from "@/src/domain/services/public-menu";
import { MenuItemCard } from "@/src/presentation/components/public-menu/MenuItemCard";
import { cn } from "@/src/presentation/components/ui/cn";

/**
 * Public menu list: ALL available items, grouped by category, no pagination.
 * The shop's items arrive once from the server (one categories + one items
 * query), so chip taps filter client-side instantly with no round trip. ?cat=
 * is kept in sync via history.pushState (shareable; SSR honours it; chips are
 * real <a href> links so no-JS still works). Images are lazy (MenuItemCard).
 */
export function MenuListClient({
  slug,
  sections,
  initialCat,
}: {
  slug: string;
  sections: PublicMenuSection[];
  initialCat: string | null;
}) {
  const t = useTranslations("publicMenu");
  const [state, setState] = useState({ cat: initialCat });
  const validCat = useCallback(
    (c: string | null) => (c && sections.some((s) => s.category.id === c) ? c : null),
    [sections],
  );

  // Back/forward: re-read ?cat= from the URL.
  useEffect(() => {
    const onPop = () => {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("view") === "book") return;
      setState({ cat: validCat(sp.get("cat")) });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [validCat]);

  const groups = useMemo(
    () => groupByCategory(flattenSections(sections, state.cat)),
    [sections, state],
  );

  const go = (e: React.MouseEvent<HTMLAnchorElement>, cat: string | null) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setState({ cat });
    window.history.pushState(window.history.state, "", menuListHref(slug, cat, 1));
    // Bring the list top into view if the user had scrolled deep into the menu.
    const list = document.querySelector("[data-testid=menu-list]");
    if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: "start" });
  };

  const chips = [{ id: null as string | null, name: t("allCategories") }, ...sections.map((s) => s.category)];

  return (
    <div className="flex flex-col gap-4 print:hidden" data-testid="menu-list">
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={t("allCategories")} data-testid="menu-cat-chips">
        {chips.map((c) => {
          const active = state.cat === c.id;
          return (
            <a
              key={c.id ?? "all"}
              href={menuListHref(slug, c.id, 1)}
              onClick={(e) => go(e, c.id)}
              aria-current={active ? "true" : undefined}
              data-cat={c.id ?? ""}
              className={cn(
                "shrink-0 select-none rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-[transform,background-color] duration-75 active:scale-95",
                active
                  ? "bg-brand-500 text-on-brand ring-brand-500"
                  : "bg-card text-foreground ring-border hover:ring-brand-300 active:bg-brand-50",
              )}
            >
              {c.name}
            </a>
          );
        })}
      </nav>

      {groups.map((g, gi) => (
        <section key={`${g.category.id}-${gi}`}>
          <h2 className="mb-2 flex items-baseline gap-2 text-lg font-bold text-foreground">
            {g.category.name}
            <span className="text-xs font-medium text-muted">
              {t("itemsCount", { count: sections.find((s) => s.category.id === g.category.id)?.items.length ?? 0 })}
            </span>
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {g.items.map((item) => (
              <li key={item.id}>
                <MenuItemCard item={item} href={`/s/${slug}/menu/${item.id}`} />
              </li>
            ))}
          </ul>
        </section>
      ))}

    </div>
  );
}
