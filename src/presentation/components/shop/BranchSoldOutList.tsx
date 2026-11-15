"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { setBranchItemSoldOutAction } from "@/src/presentation/actions/branch-actions";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { useToast } from "@/src/presentation/components/ui/Toast";

interface Item {
  id: string;
  name: string;
  globallyAvailable: boolean;
}

/** Per-branch sold-out overrides for the shop's shared menu items. */
export function BranchSoldOutList({
  branchId,
  items,
  soldOutIds,
}: {
  branchId: string;
  items: Item[];
  soldOutIds: string[];
}) {
  const t = useTranslations("branch");
  const [sold, setSold] = useState<Set<string>>(new Set(soldOutIds));
  const [, start] = useTransition();
  const toast = useToast();

  function toggle(item: Item, checked: boolean) {
    const prev = new Set(sold);
    const next = new Set(sold);
    if (checked) next.add(item.id);
    else next.delete(item.id);
    setSold(next);
    start(async () => {
      const res = await setBranchItemSoldOutAction(branchId, item.id, checked);
      if (res.error) {
        setSold(prev);
        toast.error(res.error);
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">{t("noMenu")}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => {
        const checked = sold.has(item.id);
        return (
          <li
            key={item.id}
            data-testid="branch-soldout-item"
            className="flex items-center gap-3 py-2"
          >
            <span className="truncate text-sm text-foreground">{item.name}</span>
            {!item.globallyAvailable && (
              <Badge tone="neutral">{t("soldOutAll")}</Badge>
            )}
            <label className="ml-auto flex shrink-0 items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={checked}
                disabled={!item.globallyAvailable}
                onChange={(e) => toggle(item, e.target.checked)}
                className="size-4 accent-brand-500"
              />
              <span className={checked ? "text-foreground" : "text-muted"}>
                {t("soldOutHere")}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
