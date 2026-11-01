/**
 * Menu options / add-ons (modifiers) — pure rules.
 *
 * A group has min/max selections; `isRequired` ⇔ minSelect ≥ 1. A selection is
 * resolved against the DB groups (never client prices) into a price delta +
 * snapshot that is stored on the order line.
 */
import type { MenuOptionGroup, OrderLineOption } from "@/src/domain/entities";
import { assertHalalMenuContent } from "@/src/domain/services/halal-menu";

export const MAX_GROUPS_PER_ITEM = 10;
export const MAX_CHOICES_PER_GROUP = 20;
export const MAX_OPTION_NAME = 60;
/** Price delta range in satang (0 … ฿10,000). No negative deltas (no discount abuse). */
export const MAX_PRICE_DELTA_SATANG = 1_000_000;

export interface OptionGroupConfigInput {
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
}

/** Validate + normalize a group config. Throws Thai messages. */
export function normalizeOptionGroupConfig(input: OptionGroupConfigInput): OptionGroupConfigInput {
  const name = normalizeOptionName(input.name, "ชื่อกลุ่มตัวเลือก");
  const max = Math.trunc(Number(input.maxSelect));
  let min = Math.trunc(Number(input.minSelect));
  if (!Number.isFinite(max) || max < 1 || max > MAX_CHOICES_PER_GROUP) {
    throw new Error(`เลือกได้สูงสุดต้องอยู่ระหว่าง 1–${MAX_CHOICES_PER_GROUP}`);
  }
  if (!Number.isFinite(min) || min < 0) throw new Error("เลือกอย่างน้อยต้องไม่ติดลบ");
  if (input.isRequired && min < 1) min = 1;
  if (!input.isRequired) min = 0;
  if (min > max) throw new Error("เลือกอย่างน้อยต้องไม่มากกว่าเลือกได้สูงสุด");
  return { name, isRequired: min >= 1, minSelect: min, maxSelect: max };
}

export function normalizeOptionName(raw: string, label = "ชื่อตัวเลือก"): string {
  const name = (raw ?? "").trim();
  if (!name) throw new Error(`กรุณากรอก${label}`);
  if (name.length > MAX_OPTION_NAME) throw new Error(`${label}ยาวเกินไป`);
  assertHalalMenuContent(name);
  return name;
}

export function normalizePriceDelta(raw: number): number {
  const v = Math.round(Number(raw));
  if (!Number.isFinite(v) || v < 0 || v > MAX_PRICE_DELTA_SATANG) {
    throw new Error("ราคาเพิ่มต้องอยู่ระหว่าง 0–10,000 บาท");
  }
  return v;
}

export interface ResolvedSelection {
  deltaSatang: number;
  options: OrderLineOption[];
}

/**
 * Resolve chosen choice ids for one item against its groups.
 * - unknown / unavailable choice → reject
 * - per group: count within [minSelect, maxSelect] (only groups with ≥1 available choice enforce min)
 * - duplicate ids → reject
 */
export function resolveOptionSelection(
  itemName: string,
  groups: MenuOptionGroup[],
  choiceIds: string[],
): ResolvedSelection {
  const ids = choiceIds ?? [];
  if (new Set(ids).size !== ids.length) throw new Error("เลือกตัวเลือกซ้ำ");
  const byChoice = new Map<string, { groupId: string; idx: number }>();
  groups.forEach((g, gi) =>
    g.choices.forEach((c) => byChoice.set(c.id, { groupId: g.id, idx: gi })),
  );
  const picked = new Map<string, string[]>();
  for (const id of ids) {
    const hit = byChoice.get(id);
    if (!hit) throw new Error(`ตัวเลือกของ "${itemName}" ไม่ถูกต้อง กรุณาเลือกใหม่`);
    const list = picked.get(hit.groupId) ?? [];
    list.push(id);
    picked.set(hit.groupId, list);
  }
  let delta = 0;
  const options: OrderLineOption[] = [];
  for (const g of [...groups].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const sel = picked.get(g.id) ?? [];
    const hasAvailable = g.choices.some((c) => c.isAvailable);
    if (sel.length > g.maxSelect) {
      throw new Error(`"${g.name}" เลือกได้ไม่เกิน ${g.maxSelect} รายการ`);
    }
    if (hasAvailable && sel.length < g.minSelect) {
      throw new Error(`กรุณาเลือก "${g.name}" ของ "${itemName}"`);
    }
    for (const c of [...g.choices].sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (!sel.includes(c.id)) continue;
      if (!c.isAvailable) throw new Error(`"${c.name}" หมดชั่วคราว กรุณาเลือกใหม่`);
      delta += c.priceDeltaSatang;
      options.push({ group: g.name, choice: c.name, priceDeltaSatang: c.priceDeltaSatang });
    }
  }
  return { deltaSatang: delta, options };
}

/** Effective switch for a shop: platform switch AND admin per-shop allow. */
export function menuOptionsEffective(platformEnabled: boolean, shopAllowed: boolean): boolean {
  return platformEnabled && shopAllowed;
}

/** Stable cart-line key: same item + same choice set = same line. */
export function cartLineKey(menuItemId: string, choiceIds: string[]): string {
  if (!choiceIds.length) return menuItemId;
  return `${menuItemId}|${[...choiceIds].sort().join(",")}`;
}

export function parseCartLineKey(key: string): { menuItemId: string; choiceIds: string[] } {
  const [menuItemId, rest] = key.split("|");
  return { menuItemId, choiceIds: rest ? rest.split(",").filter(Boolean) : [] };
}

/** Parse an order line's stored JSON snapshot (tolerant: bad JSON → []). */
export function parseOrderLineOptions(json: string | null | undefined): OrderLineOption[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v
      .filter((o) => o && typeof o.group === "string" && typeof o.choice === "string")
      .map((o) => ({
        group: o.group,
        choice: o.choice,
        priceDeltaSatang: Number(o.priceDeltaSatang) || 0,
      }));
  } catch {
    return [];
  }
}

/** Short one-line label, e.g. "หวานน้อย, ไข่มุก (+฿10)". */
export function formatOrderLineOptions(options: OrderLineOption[]): string {
  return options
    .map((o) =>
      o.priceDeltaSatang > 0 ? `${o.choice} (+฿${(o.priceDeltaSatang / 100).toFixed(o.priceDeltaSatang % 100 ? 2 : 0)})` : o.choice,
    )
    .join(", ");
}
