import type { MenuCategory, MenuItem } from "@/src/domain/entities";

/** Public read-only menu (/s/[slug]/menu) — pure helpers (no I/O). */

export type MenuView = "normal" | "book";

export const PUBLIC_MENU_PAGE_SIZE = 12;
export const BOOK_ITEMS_PER_PAGE = 6;

export interface PublicMenuSection {
  category: MenuCategory;
  items: MenuItem[];
}

export function parseMenuView(v: string | string[] | undefined): MenuView {
  return (Array.isArray(v) ? v[0] : v) === "book" ? "book" : "normal";
}

/** `?page=` → integer ≥ 1 (junk → 1). Clamping to totalPages is done by paginate. */
export function parsePageParam(v: string | string[] | undefined): number {
  const n = Number.parseInt(String(Array.isArray(v) ? v[0] : (v ?? "")), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Only items a customer could see: available + in an active category of the same shop. */
export function isPublicMenuItem(
  item: MenuItem,
  category: MenuCategory | null | undefined,
): boolean {
  return (
    item.isAvailable &&
    !!category &&
    category.isActive &&
    category.id === item.categoryId &&
    category.shopId === item.shopId
  );
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

export function paginate<T>(all: T[], page: number, perPage: number): PageSlice<T> {
  const size = Math.max(1, Math.floor(perPage));
  const totalPages = Math.max(1, Math.ceil(all.length / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  return {
    items: all.slice((p - 1) * size, p * size),
    page: p,
    totalPages,
    total: all.length,
  };
}

/** Flatten sections (optionally one category) to an ordered list keeping the category. */
export function flattenSections(
  sections: PublicMenuSection[],
  categoryId?: string | null,
): { category: MenuCategory; item: MenuItem }[] {
  return sections
    .filter((s) => !categoryId || s.category.id === categoryId)
    .flatMap((s) => s.items.map((item) => ({ category: s.category, item })));
}

/** Group a flat page slice back into consecutive category runs (for headings). */
export function groupByCategory(
  rows: { category: MenuCategory; item: MenuItem }[],
): PublicMenuSection[] {
  const out: PublicMenuSection[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.category.id === r.category.id) last.items.push(r.item);
    else out.push({ category: r.category, items: [r.item] });
  }
  return out;
}

export type BookPage =
  | { kind: "cover" }
  | { kind: "toc"; sections: { category: MenuCategory; page: number }[] }
  | {
      kind: "category";
      category: MenuCategory;
      items: MenuItem[];
      /** 1-based part within the category and how many parts it spans. */
      part: number;
      parts: number;
    }
  | { kind: "blank" }
  | { kind: "back" };

/**
 * Book sheet order: cover → contents → per-category pages (chunked to fit) →
 * back cover. A blank leaf is inserted so the sheet count is even, keeping the
 * back cover on its own at the end of a spread on wide screens.
 */
export function buildBookPages(
  sections: PublicMenuSection[],
  perPage = BOOK_ITEMS_PER_PAGE,
): BookPage[] {
  const size = Math.max(1, Math.floor(perPage));
  const body: BookPage[] = [];
  const toc: { category: MenuCategory; page: number }[] = [];
  for (const s of sections) {
    if (s.items.length === 0) continue;
    const parts = Math.ceil(s.items.length / size);
    // cover = 1, toc = 2 → first body page is 3
    toc.push({ category: s.category, page: 3 + body.length });
    for (let i = 0; i < parts; i++) {
      body.push({
        kind: "category",
        category: s.category,
        items: s.items.slice(i * size, (i + 1) * size),
        part: i + 1,
        parts,
      });
    }
  }
  const pages: BookPage[] = [{ kind: "cover" }, { kind: "toc", sections: toc }, ...body];
  if ((pages.length + 1) % 2 !== 0) pages.push({ kind: "blank" });
  pages.push({ kind: "back" });
  return pages;
}
