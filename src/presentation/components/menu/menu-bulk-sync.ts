/**
 * Tiny client-side bus so the main MenuManager list reflects bulk-edit results
 * (update/undo/delete) without a full router.refresh().
 */
export type MenuBulkPatch = {
  after?: { id: string; categoryId: string; priceSatang: number; isAvailable: boolean; isRecommended: boolean }[];
  deletedIds?: string[];
};

const EVT = "menu-bulk-patch";

export function emitMenuBulkPatch(p: MenuBulkPatch) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<MenuBulkPatch>(EVT, { detail: p }));
}

export function onMenuBulkPatch(fn: (p: MenuBulkPatch) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<MenuBulkPatch>).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

export function applyMenuBulkPatch<T extends { id: string; categoryId: string; priceSatang: number; isAvailable: boolean; isRecommended: boolean }>(
  items: T[],
  p: MenuBulkPatch,
): T[] {
  const upd = new Map((p.after ?? []).map((a) => [a.id, a]));
  const gone = new Set(p.deletedIds ?? []);
  return items
    .filter((i) => !gone.has(i.id))
    .map((i) => {
      const a = upd.get(i.id);
      return a
        ? { ...i, categoryId: a.categoryId, priceSatang: a.priceSatang, isAvailable: a.isAvailable, isRecommended: a.isRecommended }
        : i;
    });
}
