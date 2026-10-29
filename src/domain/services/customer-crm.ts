/**
 * Pure CRM helpers for /shop/customers (tabs, filters, sort, summary, CSV).
 * Kept framework-free so they are unit-testable.
 */

export interface CrmCustomerRow {
  id: string;
  phone: string;
  displayName: string | null;
  publicCode: string;
  onlineOrderStatus: string;
  onlineOrderRequestedAt: string | null;
  tags: string[];
  note: string | null;
  blockedAt: string | null;
  newMemberClearedAt: string | null;
  createdAt: string;
  orderCount: number;
  totalSpendSatang: number;
  lastOrderAt: string | null;
  points: number;
}

export const CRM_TABS = ["active", "pending", "vip", "lapsed", "blocked", "all"] as const;
export type CrmTab = (typeof CRM_TABS)[number];
export const CRM_SORTS = ["recent", "spend", "orders", "lastOrder", "points"] as const;
export type CrmSort = (typeof CRM_SORTS)[number];
export type SignupChannel = "static" | "instore";

export const LAPSED_DAYS = 30;
const DAY = 86_400_000;

/** "0812345678" -> "081•••5678". Non-phones (anonymized) pass through masked. */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length < 7) return "•••";
  return `${d.slice(0, 3)}•••${d.slice(-4)}`;
}

/** Static-QR signups went through the membership request flow. */
export function signupChannel(c: Pick<CrmCustomerRow, "onlineOrderStatus" | "onlineOrderRequestedAt">): SignupChannel {
  return c.onlineOrderRequestedAt || c.onlineOrderStatus !== "none" ? "static" : "instore";
}

export function isLapsed(c: CrmCustomerRow, now = Date.now()): boolean {
  return !!c.lastOrderAt && now - Date.parse(c.lastOrderAt) > LAPSED_DAYS * DAY;
}

export function inTab(c: CrmCustomerRow, tab: CrmTab, now = Date.now()): boolean {
  const blocked = !!c.blockedAt;
  switch (tab) {
    case "all":
      return true;
    case "blocked":
      return blocked;
    case "pending":
      return !blocked && c.onlineOrderStatus === "pending";
    case "vip":
      return !blocked && c.tags.includes("vip");
    case "lapsed":
      return !blocked && c.onlineOrderStatus !== "pending" && isLapsed(c, now);
    case "active":
      return !blocked && c.onlineOrderStatus !== "pending" && c.onlineOrderStatus !== "rejected";
  }
}

export interface CrmQuery {
  tab?: string;
  q?: string;
  channel?: string;
  sort?: string;
}

export function normalizeQuery(q: CrmQuery): Required<CrmQuery> & { tab: CrmTab; sort: CrmSort } {
  return {
    tab: (CRM_TABS as readonly string[]).includes(q.tab ?? "") ? (q.tab as CrmTab) : "active",
    sort: (CRM_SORTS as readonly string[]).includes(q.sort ?? "") ? (q.sort as CrmSort) : "recent",
    q: (q.q ?? "").trim().slice(0, 64),
    channel: q.channel === "static" || q.channel === "instore" ? q.channel : "",
  };
}

export function queryCrm(rows: CrmCustomerRow[], query: CrmQuery, now = Date.now()): CrmCustomerRow[] {
  const q = normalizeQuery(query);
  const needle = q.q.toLowerCase();
  const digits = q.q.replace(/\D/g, "");
  const out = rows.filter((c) => {
    if (!inTab(c, q.tab, now)) return false;
    if (q.channel && signupChannel(c) !== q.channel) return false;
    if (needle) {
      const hit =
        (c.displayName ?? "").toLowerCase().includes(needle) ||
        c.publicCode.toLowerCase() === needle ||
        (digits.length >= 3 && c.phone.includes(digits));
      if (!hit) return false;
    }
    return true;
  });
  const by: Record<CrmSort, (a: CrmCustomerRow, b: CrmCustomerRow) => number> = {
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
    spend: (a, b) => b.totalSpendSatang - a.totalSpendSatang,
    orders: (a, b) => b.orderCount - a.orderCount,
    lastOrder: (a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""),
    points: (a, b) => b.points - a.points,
  };
  return out.sort(by[q.sort]);
}

/** Start of the current month in Asia/Bangkok, as an ISO instant. */
export function monthStartBangkok(now = Date.now()): string {
  const bkk = new Date(now + 7 * 3_600_000);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), 1) - 7 * 3_600_000).toISOString();
}

export interface CrmSummary {
  total: number;
  newThisMonth: number;
  pending: number;
  lapsed: number;
  outstandingPoints: number;
}

export interface CrmOverview {
  summary: CrmSummary;
  tabs: Record<CrmTab, number>;
}

export const CRM_PAGE_SIZES = [25, 50, 100] as const;
export function normalizePageSize(v: unknown): number {
  const n = Number(v);
  return (CRM_PAGE_SIZES as readonly number[]).includes(n) ? n : 25;
}

export function summarize(rows: CrmCustomerRow[], now = Date.now()): CrmSummary {
  const ms = monthStartBangkok(now);
  return {
    total: rows.length,
    newThisMonth: rows.filter((c) => c.createdAt >= ms).length,
    pending: rows.filter((c) => inTab(c, "pending", now)).length,
    lapsed: rows.filter((c) => inTab(c, "lapsed", now)).length,
    outstandingPoints: rows.reduce((s, c) => s + Math.max(0, c.points), 0),
  };
}

const TAG_RE = /^[\p{L}\p{M}\p{N}_-]{1,24}$/u;
/** Normalize user-entered tags: trimmed, lowercase, unique, max 10. */
export function normalizeTags(input: string[]): string[] {
  const out: string[] = [];
  for (const raw of input) {
    const t = raw.trim().toLowerCase();
    if (t && TAG_RE.test(t) && !out.includes(t)) out.push(t);
  }
  if (out.length > 10) throw new Error("แท็กได้ไม่เกิน 10 รายการ");
  return out;
}

function csvCell(v: string | number | null): string {
  let s = v == null ? "" : String(v);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: CrmCustomerRow[], opts: { fullPhone: boolean }): string {
  const header = [
    "name", "phone", "member_code", "channel", "status", "tags",
    "orders", "total_spend_thb", "last_order_at", "points", "joined_at",
  ];
  const lines = rows.map((c) =>
    [
      c.displayName,
      opts.fullPhone ? c.phone : maskPhone(c.phone),
      c.publicCode,
      signupChannel(c),
      c.blockedAt ? "blocked" : c.onlineOrderStatus,
      c.tags.join("|"),
      c.orderCount,
      (c.totalSpendSatang / 100).toFixed(2),
      c.lastOrderAt,
      c.points,
      c.createdAt,
    ].map(csvCell).join(","),
  );
  // BOM so Excel opens Thai correctly.
  return "\uFEFF" + [header.join(","), ...lines].join("\r\n") + "\r\n";
}
