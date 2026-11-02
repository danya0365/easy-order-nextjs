/**
 * Batch menu editing (/shop/menu "เลือกหลายรายการ") — pure helpers, no I/O.
 * The server action re-plans from DB state with these same functions, so the
 * preview the owner sees and what gets written always agree.
 */

export const BULK_MAX_IDS = 200;
export const BULK_PAGE_SIZE = 25;

export type PriceRounding = "none" | "baht" | "five" | "ten";

export type BulkOp =
  | { kind: "available"; value: boolean }
  | { kind: "recommended"; value: boolean }
  | { kind: "category"; categoryId: string }
  | { kind: "price"; mode: "set" | "baht" | "percent"; amount: number; rounding: PriceRounding }
  | { kind: "delete" };

export type BulkOpKind = BulkOp["kind"];

/** Branch staff may only flip availability; owners (and impersonating admins) everything. */
export function canRunBulkOp(role: string, kind: BulkOpKind): boolean {
  if (role === "shop_owner" || role === "platform_admin") return true;
  if (role === "branch_staff") return kind === "available";
  return false;
}

/** Minimal item shape the planner needs. */
export interface BulkItem {
  id: string;
  shopId: string;
  name: string;
  categoryId: string;
  priceSatang: number;
  isAvailable: boolean;
  isRecommended: boolean;
}

/** Fields an op can change (also the undo snapshot shape). */
export interface BulkSnapshot {
  id: string;
  categoryId: string;
  priceSatang: number;
  isAvailable: boolean;
  isRecommended: boolean;
}

export interface BulkDiffRow {
  id: string;
  name: string;
  before: BulkSnapshot;
  after: BulkSnapshot | null; // null = deleted
  changed: boolean;
}

function roundSatang(satang: number, rounding: PriceRounding): number {
  const step = rounding === "baht" ? 100 : rounding === "five" ? 500 : rounding === "ten" ? 1000 : 1;
  return Math.round(satang / step) * step;
}

/** New price for one item; throws on invalid input or a negative result. */
export function applyPriceOp(
  priceSatang: number,
  op: Extract<BulkOp, { kind: "price" }>,
): number {
  if (!Number.isFinite(op.amount)) throw new Error("จำนวนไม่ถูกต้อง");
  let next: number;
  if (op.mode === "set") {
    if (op.amount < 0) throw new Error("ราคาต้องไม่ติดลบ");
    next = Math.round(op.amount * 100);
  } else if (op.mode === "baht") {
    next = priceSatang + Math.round(op.amount * 100);
  } else {
    if (op.amount < -100 || op.amount > 1000) throw new Error("เปอร์เซ็นต์ไม่ถูกต้อง");
    next = priceSatang * (1 + op.amount / 100);
  }
  next = roundSatang(next, op.rounding);
  if (next < 0) throw new Error("ราคาหลังปรับติดลบ — ปรับไม่ได้");
  return next;
}

export function snapshotOf(i: BulkItem): BulkSnapshot {
  return {
    id: i.id,
    categoryId: i.categoryId,
    priceSatang: i.priceSatang,
    isAvailable: i.isAvailable,
    isRecommended: i.isRecommended,
  };
}

/** Before/after rows for the preview + the server write. Throws on bad ops. */
export function planBulk(items: BulkItem[], op: BulkOp): BulkDiffRow[] {
  return items.map((i) => {
    const before = snapshotOf(i);
    if (op.kind === "delete") return { id: i.id, name: i.name, before, after: null, changed: true };
    const after = { ...before };
    if (op.kind === "available") after.isAvailable = op.value;
    else if (op.kind === "recommended") after.isRecommended = op.value;
    else if (op.kind === "category") after.categoryId = op.categoryId;
    else after.priceSatang = applyPriceOp(i.priceSatang, op);
    const changed =
      after.isAvailable !== before.isAvailable ||
      after.isRecommended !== before.isRecommended ||
      after.categoryId !== before.categoryId ||
      after.priceSatang !== before.priceSatang;
    return { id: i.id, name: i.name, before, after, changed };
  });
}

/** Validate a requested id list: non-empty, unique, ≤ BULK_MAX_IDS. */
export function normalizeBulkIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) throw new Error("รายการไม่ถูกต้อง");
  const uniq = [...new Set(ids.filter((x): x is string => typeof x === "string" && x.length > 0))];
  if (uniq.length === 0) throw new Error("ยังไม่ได้เลือกเมนู");
  if (uniq.length > BULK_MAX_IDS) throw new Error(`เลือกได้สูงสุด ${BULK_MAX_IDS} รายการต่อครั้ง`);
  return uniq;
}

export type BulkStatusFilter = "all" | "available" | "soldout" | "recommended";

export interface BulkListQuery {
  q: string;
  cat: string | null;
  status: BulkStatusFilter;
  page: number;
}

export function parseBulkQuery(sp: Record<string, string | undefined>): BulkListQuery {
  const status = (["available", "soldout", "recommended"] as const).find((s) => s === sp.bstatus) ?? "all";
  const page = Number.parseInt(sp.bpage ?? "", 10);
  return {
    q: (sp.bq ?? "").slice(0, 80),
    cat: sp.bcat || null,
    status,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  };
}

export function bulkQueryString(q: BulkListQuery): string {
  const p = new URLSearchParams();
  if (q.q) p.set("bq", q.q);
  if (q.cat) p.set("bcat", q.cat);
  if (q.status !== "all") p.set("bstatus", q.status);
  if (q.page > 1) p.set("bpage", String(q.page));
  return p.toString();
}

export function filterBulkItems<T extends BulkItem & { description?: string | null }>(
  items: T[],
  q: BulkListQuery,
): T[] {
  const needle = q.q.trim().toLowerCase();
  return items.filter(
    (i) =>
      (!q.cat || i.categoryId === q.cat) &&
      (q.status === "all" ||
        (q.status === "available" && i.isAvailable) ||
        (q.status === "soldout" && !i.isAvailable) ||
        (q.status === "recommended" && i.isRecommended)) &&
      (!needle || i.name.toLowerCase().includes(needle) || (i.description ?? "").toLowerCase().includes(needle)),
  );
}

export function pageOf<T>(all: T[], page: number, size = BULK_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(all.length / size));
  const p = Math.min(Math.max(1, page), totalPages);
  return { items: all.slice((p - 1) * size, p * size), page: p, totalPages, total: all.length };
}
