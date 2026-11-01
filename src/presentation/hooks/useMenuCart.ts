"use client";

import { useCallback, useMemo, useState } from "react";

import type { MenuItem, MenuOptionGroup, OrderLineOption } from "@/src/domain/entities";
import type { KioskMenuSection } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import {
  cartLineKey,
  parseCartLineKey,
} from "@/src/domain/services/menu-options";

/** key (itemId or itemId|choiceIds) -> qty */
export type MenuCart = Record<string, number>;

export interface CartLineInfo {
  key: string;
  item: MenuItem;
  qty: number;
  choiceIds: string[];
  options: OrderLineOption[];
  /** Display-only unit price (server recomputes from DB). */
  unitSatang: number;
}

/**
 * Cart state shared by kiosk / online / counter ordering. Lines are keyed by
 * item + chosen options so the same item with different options are separate
 * lines. Prices here are for display only — the server recomputes.
 */
export function useMenuCart(
  sections: KioskMenuSection[],
  optionGroups: MenuOptionGroup[] | null | undefined,
) {
  const [cart, setCart] = useState<MenuCart>({});

  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const s of sections) for (const it of s.items) map.set(it.id, it);
    return map;
  }, [sections]);

  const groupsByItem = useMemo(() => {
    const map = new Map<string, MenuOptionGroup[]>();
    for (const g of optionGroups ?? []) {
      map.set(g.menuItemId, [...(map.get(g.menuItemId) ?? []), g]);
    }
    return map;
  }, [optionGroups]);

  const lineInfo = useCallback(
    (key: string, qty: number): CartLineInfo | null => {
      const { menuItemId, choiceIds } = parseCartLineKey(key);
      const item = itemsById.get(menuItemId);
      if (!item) return null;
      const options: OrderLineOption[] = [];
      let delta = 0;
      for (const g of groupsByItem.get(item.id) ?? []) {
        for (const c of g.choices) {
          if (choiceIds.includes(c.id)) {
            options.push({ group: g.name, choice: c.name, priceDeltaSatang: c.priceDeltaSatang });
            delta += c.priceDeltaSatang;
          }
        }
      }
      return { key, item, qty, choiceIds, options, unitSatang: item.priceSatang + delta };
    },
    [itemsById, groupsByItem],
  );

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([k, q]) => lineInfo(k, q))
        .filter((l): l is CartLineInfo => l !== null),
    [cart, lineInfo],
  );

  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotalSatang = lines.reduce((a, l) => a + l.unitSatang * l.qty, 0);

  const setLineQty = useCallback((key: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[key];
      else next[key] = qty;
      return next;
    });
  }, []);

  const addLine = useCallback((itemId: string, choiceIds: string[], qty: number) => {
    const key = cartLineKey(itemId, choiceIds);
    setCart((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + qty }));
  }, []);

  const qtyOfItem = useCallback(
    (itemId: string) =>
      lines.filter((l) => l.item.id === itemId).reduce((a, l) => a + l.qty, 0),
    [lines],
  );

  const payload = useCallback(
    () =>
      lines.map((l) => ({
        menuItemId: l.item.id,
        quantity: l.qty,
        optionChoiceIds: l.choiceIds,
      })),
    [lines],
  );

  const clear = useCallback(() => setCart({}), []);

  return {
    cart,
    lines,
    count,
    subtotalSatang,
    itemsById,
    groupsByItem,
    setLineQty,
    addLine,
    qtyOfItem,
    payload,
    clear,
  };
}
