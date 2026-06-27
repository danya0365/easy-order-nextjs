"use client";

import { Fragment, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "./Button";
import { cn } from "./cn";

/** Mirror of the repository `Page<T>` shape, returned by load-more actions. */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Generic cursor-paginated list. Renders `initialItems` (fetched server-side),
 * then a "โหลดเพิ่ม" button that calls `loadMore(cursor)` and appends the next
 * page. The button hides once `nextCursor` is null. Items render client-side via
 * `renderItem`, so each surface keeps its own row markup while sharing the
 * fetch/append/error/pending plumbing.
 */
export function LoadMore<T>({
  initialItems,
  initialCursor,
  loadMore,
  renderItem,
  getKey,
  listClassName = "flex flex-col divide-y divide-border",
}: {
  initialItems: T[];
  initialCursor: string | null;
  loadMore: (cursor: string) => Promise<CursorPage<T>>;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  listClassName?: string;
}) {
  const t = useTranslations("common");
  const [items, setItems] = useState<T[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onLoad() {
    if (!cursor) return;
    const c = cursor;
    startTransition(async () => {
      try {
        const page = await loadMore(c);
        setItems((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setError(null);
      } catch {
        setError(t("loadMoreError"));
      }
    });
  }

  return (
    <div>
      <ul className={cn(listClassName)}>
        {items.map((item) => (
          <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
        ))}
      </ul>
      {error && <p className="mt-2 text-center text-sm text-error">{error}</p>}
      {cursor && (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLoad}
            loading={pending}
          >
            {pending ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
