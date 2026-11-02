"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  flattenSections,
  menuListHref,
  groupByCategory,
  paginate,
  parsePageParam,
  PUBLIC_MENU_PAGE_SIZE,
  type PublicMenuSection,
} from "@/src/domain/services/public-menu";
import { MenuItemCard } from "@/src/presentation/components/public-menu/MenuItemCard";
import { cn } from "@/src/presentation/components/ui/cn";

/**
 * Public menu list with client-side category filter + pagination. All of the
 * shop's public items arrive once from the server (menus are small), so chip /
 * page taps update instantly with no server round trip. The URL is kept in sync
 * via history.pushState (?cat=&page= stay shareable; SSR honours them, and
 * the chips/pager are real <a href> links so no-JS still works).
 */
export function MenuListClient({
  slug,
  sections,
  initialCat,
  initialPage,
}: {
  slug: string;
  sections: PublicMenuSection[];
  initialCat: string | null;
  initialPage: number;
}) {
  const t = useTranslations("publicMenu");
  const [state, setState] = useState({ cat: initialCat, page: initialPage });
  const validCat = useCallback(
    (c: string | null) => (c && sections.some((s) => s.category.id === c) ? c : null),
    [sections],
  );

  // Back/forward: re-read ?cat=&page= from the URL.
  useEffect(() => {
    const onPop = () => {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("view") === "book") return;
      setState({ cat: validCat(sp.get("cat")), page: parsePageParam(sp.get("page") ?? undefined) });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [validCat]);

  const slice = useMemo(
    () => paginate(flattenSections(sections, state.cat), state.page, PUBLIC_MENU_PAGE_SIZE),
    [sections, state],
  );
  const groups = useMemo(() => groupByCategory(slice.items), [slice]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, cat: string | null, page: number, scroll: boolean) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const next = { cat, page };
    setState(next);
    window.history.pushState(window.history.state, "", menuListHref(slug, cat, page));
    if (scroll) document.querySelector("[data-testid=menu-list]")?.scrollIntoView({ block: "start" });
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
              onClick={(e) => go(e, c.id, 1, false)}
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

      {slice.totalPages > 1 && (
        <nav className="flex items-center justify-between gap-2" aria-label={t("pagination")} data-testid="menu-pagination">
          {slice.page > 1 ? (
            <a
              href={menuListHref(slug, state.cat, slice.page - 1)}
              onClick={(e) => go(e, state.cat, slice.page - 1, true)}
              rel="prev"
              className="inline-flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-sm font-semibold ring-1 ring-border active:scale-95"
            >
              <ChevronLeft className="size-4" /> {t("prev")}
            </a>
          ) : <span />}
          <span className="text-sm text-muted">{t("pageOf", { page: String(slice.page), total: slice.totalPages })}</span>
          {slice.page < slice.totalPages ? (
            <a
              href={menuListHref(slug, state.cat, slice.page + 1)}
              onClick={(e) => go(e, state.cat, slice.page + 1, true)}
              rel="next"
              className="inline-flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-sm font-semibold ring-1 ring-border active:scale-95"
            >
              {t("next")} <ChevronRight className="size-4" />
            </a>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
