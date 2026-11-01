"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus, Plus, X } from "lucide-react";

import type { MenuItem, MenuOptionGroup } from "@/src/domain/entities";
import { resolveOptionSelection } from "@/src/domain/services/menu-options";
import { satangToBaht } from "@/src/presentation/lib/money";
import { menuImageSrc } from "@/src/presentation/lib/menu-image";
import { Button } from "@/src/presentation/components/ui/Button";
import { cn } from "@/src/presentation/components/ui/cn";

/**
 * Bottom sheet / modal for one menu item: big image, description, price and —
 * when menu options are on — the option pickers. "Add" passes the chosen choice
 * ids + qty up; the server recomputes the price.
 */
export function ItemDetailSheet({
  item,
  groups,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  groups: MenuOptionGroup[];
  onClose: () => void;
  onAdd: (choiceIds: string[], qty: number) => void;
}) {
  const t = useTranslations("menuOptions");
  const [picked, setPicked] = useState<Record<string, string[]>>(() => {
    // Preselect the first available choice of required single-pick groups.
    const init: Record<string, string[]> = {};
    for (const g of groups) {
      if (g.minSelect === 1 && g.maxSelect === 1) {
        const first = g.choices.find((c) => c.isAvailable);
        if (first) init[g.id] = [first.id];
      }
    }
    return init;
  });
  const [qty, setQty] = useState(1);
  const imageSrc = menuImageSrc(item);

  const choiceIds = useMemo(() => Object.values(picked).flat(), [picked]);
  const check = useMemo(() => {
    try {
      return { ok: true as const, ...resolveOptionSelection(item.name, groups, choiceIds) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message, deltaSatang: 0 };
    }
  }, [item.name, groups, choiceIds]);
  const unit = item.priceSatang + check.deltaSatang;

  function toggle(g: MenuOptionGroup, choiceId: string) {
    setPicked((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.maxSelect === 1) return { ...prev, [g.id]: cur[0] === choiceId && g.minSelect === 0 ? [] : [choiceId] };
      if (cur.includes(choiceId)) return { ...prev, [g.id]: cur.filter((x) => x !== choiceId) };
      if (cur.length >= g.maxSelect) return prev;
      return { ...prev, [g.id]: [...cur, choiceId] };
    });
  }

  function rule(g: MenuOptionGroup) {
    if (g.minSelect === g.maxSelect) return t("pickExactly", { n: g.maxSelect });
    if (g.minSelect > 0) return t("pickAtLeast", { min: g.minSelect, max: g.maxSelect });
    return t("pickUpTo", { n: g.maxSelect });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
      data-testid="item-detail-sheet"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
            <img src={imageSrc} alt={item.name} className="aspect-[4/3] w-full bg-muted-surface object-cover" />
          ) : (
            <div className="h-14" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">{item.name}</h2>
            {item.description && <p className="mt-1 whitespace-pre-line text-sm text-muted">{item.description}</p>}
            <p className="mt-2 text-lg font-semibold text-brand-700">฿{satangToBaht(item.priceSatang)}</p>
          </div>

          {groups.map((g) => (
            <fieldset key={g.id} className="flex flex-col gap-2" data-testid="option-group-picker">
              <legend className="mb-1 flex w-full items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{g.name}</span>
                <span className="text-xs text-muted">
                  {g.minSelect > 0 ? t("requiredBadge") : t("optionalBadge")} · {rule(g)}
                </span>
              </legend>
              {g.choices.map((c) => {
                const on = (picked[g.id] ?? []).includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!c.isAvailable}
                    onClick={() => toggle(g, c.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm transition disabled:opacity-50",
                      on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border bg-card text-foreground hover:border-brand-300",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex size-5 items-center justify-center border",
                          g.maxSelect === 1 ? "rounded-full" : "rounded-md",
                          on ? "border-brand-500 bg-brand-500 text-on-brand" : "border-border",
                        )}
                      >
                        {on && <Check className="size-3.5" />}
                      </span>
                      {c.name}
                      {!c.isAvailable && <span className="text-xs text-muted">({t("soldOut")})</span>}
                    </span>
                    {c.priceDeltaSatang > 0 && <span className="shrink-0 text-muted">+฿{satangToBaht(c.priceDeltaSatang)}</span>}
                  </button>
                );
              })}
            </fieldset>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-border p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="-"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="inline-flex size-10 items-center justify-center rounded-full bg-muted-surface text-foreground"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-lg font-bold text-foreground">{qty}</span>
            <button
              type="button"
              aria-label="+"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              className="inline-flex size-10 items-center justify-center rounded-full bg-brand-500 text-on-brand"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="ml-auto flex-1"
            disabled={!check.ok || !item.isAvailable}
            data-testid="item-detail-add"
            onClick={() => {
              onAdd(choiceIds, qty);
              onClose();
            }}
          >
            {t("addToCart", { amount: satangToBaht(unit * qty) })}
          </Button>
        </div>
        {!check.ok && <p className="px-4 pb-3 text-xs text-warning">{check.error}</p>}
      </div>
    </div>
  );
}
