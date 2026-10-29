import type { MenuCategory, MenuItem } from "@/src/domain/entities";

const DEFAULT_LIMIT = 6;
const MAX_PER_CATEGORY = 2;

function hasImage(item: MenuItem): boolean {
  return !!item.imageUrl && item.imageUrl.trim().length > 0;
}

function bySortThenCreated(a: MenuItem, b: MenuItem): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Select up to `limit` menu items for the public "เมนูแนะนำ" section.
 * Curated (`isRecommended`) wins when any candidate is marked; otherwise
 * auto-pick prefers images, then sortOrder, with ≤2 items per category
 * (cap lifts only when no other categories remain to fill the slots).
 */
export function selectRecommendedMenuItems(
  items: MenuItem[],
  categories: MenuCategory[],
  limit = DEFAULT_LIMIT,
): MenuItem[] {
  const activeCategoryIds = new Set(
    categories.filter((c) => c.isActive).map((c) => c.id),
  );

  const candidates = items.filter(
    (item) => item.isAvailable && activeCategoryIds.has(item.categoryId),
  );
  if (candidates.length === 0) return [];

  const curated = candidates.filter((item) => item.isRecommended);
  if (curated.length > 0) {
    return [...curated].sort(bySortThenCreated).slice(0, limit);
  }

  const ordered = [...candidates].sort((a, b) => {
    const ai = hasImage(a) ? 0 : 1;
    const bi = hasImage(b) ? 0 : 1;
    if (ai !== bi) return ai - bi;
    return bySortThenCreated(a, b);
  });

  const picked: MenuItem[] = [];
  const perCategory = new Map<string, number>();

  // Pass 1: respect ≤2 per category.
  for (const item of ordered) {
    if (picked.length >= limit) break;
    const count = perCategory.get(item.categoryId) ?? 0;
    if (count >= MAX_PER_CATEGORY) continue;
    picked.push(item);
    perCategory.set(item.categoryId, count + 1);
  }

  // Pass 2: if still short and no other categories left, fill without the cap.
  if (picked.length < limit) {
    const pickedIds = new Set(picked.map((i) => i.id));
    for (const item of ordered) {
      if (picked.length >= limit) break;
      if (pickedIds.has(item.id)) continue;
      picked.push(item);
      pickedIds.add(item.id);
    }
  }

  return picked;
}
