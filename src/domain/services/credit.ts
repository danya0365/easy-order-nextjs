/**
 * Prepaid CREDIT wallet — pure rules (no I/O).
 *
 * A shop holds a baht balance (satang). Once per business day a daily job
 * settles the previous day: if its sales reached the threshold (default
 * ฿50) the daily fee (default ฿5) is deducted. The shop tops up via
 * PromptPay slips reviewed by an admin. Everything is driven by a JSON config:
 * platform defaults + optional per-shop overrides (daily / low-balance).
 *
 * Independent of the legacy day-subscription and daily-fee billing — each has
 * its own master switch.
 */

export const CREDIT_COUNT_STATUSES = ["pending", "preparing", "ready", "completed"] as const;
export type CreditCountStatus = (typeof CREDIT_COUNT_STATUSES)[number];

export const CREDIT_LOW_MODES = ["warn", "block"] as const;
export type CreditLowMode = (typeof CREDIT_LOW_MODES)[number];

export const CREDIT_ENTRY_TYPES = ["topup", "deduction", "refund", "adjust", "bonus", "starting"] as const;
export type CreditEntryType = (typeof CREDIT_ENTRY_TYPES)[number];

export const CREDIT_DAILY_METRICS = ["orders", "sales"] as const;
export type CreditDailyMetric = (typeof CREDIT_DAILY_METRICS)[number];

/**
 * DAILY threshold fee: once per shop per business day, if that day's ORDER
 * COUNT (metric "orders", default) or sales (metric "sales") — counting only
 * orders in `countStatuses`, cancelled never — reaches the threshold, deduct
 * `feeSatang` from the wallet. Below the threshold: nothing.
 */
export interface CreditDailyConfig {
  /** What the threshold measures. Default: number of orders. */
  metric: CreditDailyMetric;
  /** Threshold when metric = "orders". Default 50 orders. */
  thresholdOrders: number;
  /** Threshold when metric = "sales" (satang). */
  thresholdSatang: number;
  feeSatang: number;
  /** "HH:MM" Asia/Bangkok — start of the business day. Default 04:00 (same as the old daily-fee billing). */
  cutoffTime: string;
  /** Use the shop's billing cutoff (shops.billing_cutoff_time) when it has one. */
  useShopCutoff: boolean;
  countStatuses: CreditCountStatus[];
  /** Sales base: full total (incl. delivery fee) or items subtotal. */
  basis: "total" | "subtotal";
  /** true: sales >= threshold charges; false: strictly greater. */
  inclusive: boolean;
  /** First business date (YYYY-MM-DD) that may be settled; "" = no limit. Set when the wallet is first switched on. */
  startDate: string;
}

export interface CreditLowBalanceConfig {
  /** Warn when balance <= this (satang). */
  warnSatang: number;
  /** Behaviour once balance <= 0: warn only (default) or close new orders. */
  mode: CreditLowMode;
  /** block: still allow orders down to -negativeLimitSatang (0 = block at 0). */
  negativeLimitSatang: number;
}

export interface CreditTopupPackage {
  id: string;
  amountSatang: number;
  bonusPercent: number;
}

export interface CreditTopupConfig {
  promptpayId: string;
  minSatang: number;
  maxSatang: number;
  allowCustom: boolean;
  packages: CreditTopupPackage[];
  /** Future hook: try slip auto-verification before manual review. */
  autoVerify: boolean;
}

export interface CreditPlatformConfig {
  enabled: boolean;
  startingCreditSatang: number;
  daily: CreditDailyConfig;
  lowBalance: CreditLowBalanceConfig;
  topup: CreditTopupConfig;
}

/** Per-shop override: any subset of daily / lowBalance, plus a kill switch. */
export interface CreditShopOverride {
  /** false = this shop is exempt (never charged / blocked). */
  enabled?: boolean;
  daily?: Partial<CreditDailyConfig>;
  lowBalance?: Partial<CreditLowBalanceConfig>;
}

export interface EffectiveCreditConfig {
  enabled: boolean;
  daily: CreditDailyConfig;
  lowBalance: CreditLowBalanceConfig;
  topup: CreditTopupConfig;
}

export const DEFAULT_CREDIT_CONFIG: CreditPlatformConfig = {
  enabled: false,
  startingCreditSatang: 0,
  daily: {
    metric: "orders",
    thresholdOrders: 50,
    thresholdSatang: 5000,
    feeSatang: 500,
    cutoffTime: "04:00",
    useShopCutoff: true,
    countStatuses: ["completed"],
    basis: "total",
    inclusive: true,
    startDate: "",
  },
  lowBalance: { warnSatang: 5000, mode: "warn", negativeLimitSatang: 0 },
  topup: {
    promptpayId: "",
    minSatang: 10000,
    maxSatang: 10_000_000,
    allowCustom: true,
    packages: [
      { id: "p100", amountSatang: 10000, bonusPercent: 0 },
      { id: "p300", amountSatang: 30000, bonusPercent: 5 },
      { id: "p500", amountSatang: 50000, bonusPercent: 10 },
    ],
    autoVerify: false,
  },
};

const int = (v: unknown, d: number, min = 0, max = 1_000_000_000) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const num = (v: unknown, d: number, min = 0, max = 100) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T =>
  list.includes(v as T) ? (v as T) : d;
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const CUT_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDaily(raw: unknown, base = DEFAULT_CREDIT_CONFIG.daily): CreditDailyConfig {
  const r = obj(raw);
  const statuses = Array.isArray(r.countStatuses)
    ? CREDIT_COUNT_STATUSES.filter((x) => (r.countStatuses as unknown[]).includes(x))
    : base.countStatuses;
  return {
    metric: pick(r.metric, CREDIT_DAILY_METRICS, base.metric),
    thresholdOrders: int(r.thresholdOrders ?? base.thresholdOrders, base.thresholdOrders),
    thresholdSatang: int(r.thresholdSatang ?? base.thresholdSatang, base.thresholdSatang),
    feeSatang: int(r.feeSatang ?? base.feeSatang, base.feeSatang),
    cutoffTime: typeof r.cutoffTime === "string" && CUT_RE.test(r.cutoffTime) ? r.cutoffTime : base.cutoffTime,
    useShopCutoff: typeof r.useShopCutoff === "boolean" ? r.useShopCutoff : base.useShopCutoff,
    countStatuses: statuses.length ? statuses : ["completed"],
    basis: pick(r.basis, ["total", "subtotal"] as const, base.basis),
    inclusive: typeof r.inclusive === "boolean" ? r.inclusive : base.inclusive,
    startDate: typeof r.startDate === "string" && (r.startDate === "" || DATE_RE.test(r.startDate)) ? r.startDate : base.startDate,
  };
}

export function normalizeLowBalance(raw: unknown, base = DEFAULT_CREDIT_CONFIG.lowBalance): CreditLowBalanceConfig {
  const r = obj(raw);
  return {
    warnSatang: int(r.warnSatang ?? base.warnSatang, base.warnSatang),
    // Legacy "grace" (per-order era) maps to block with its negative limit.
    mode: r.mode === "grace" ? "block" : pick(r.mode, CREDIT_LOW_MODES, base.mode),
    negativeLimitSatang: int(r.negativeLimitSatang ?? base.negativeLimitSatang, base.negativeLimitSatang),
  };
}

export function normalizePlatformConfig(raw: unknown): CreditPlatformConfig {
  const r = obj(raw);
  const d = DEFAULT_CREDIT_CONFIG;
  const t = obj(r.topup);
  const packages = Array.isArray(t.packages)
    ? (t.packages as unknown[])
        .map((p, i) => ({
          id: String(obj(p).id ?? `p${i}`).slice(0, 32) || `p${i}`,
          amountSatang: int(obj(p).amountSatang, 0),
          bonusPercent: num(obj(p).bonusPercent, 0, 0, 1000),
        }))
        .filter((p) => p.amountSatang > 0)
        .slice(0, 12)
    : d.topup.packages;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    startingCreditSatang: int(r.startingCreditSatang ?? d.startingCreditSatang, 0),
    daily: normalizeDaily(r.daily),
    lowBalance: normalizeLowBalance(r.lowBalance),
    topup: {
      promptpayId: String(t.promptpayId ?? d.topup.promptpayId).replace(/[^0-9]/g, "").slice(0, 15),
      minSatang: int(t.minSatang ?? d.topup.minSatang, d.topup.minSatang),
      maxSatang: int(t.maxSatang ?? d.topup.maxSatang, d.topup.maxSatang),
      allowCustom: typeof t.allowCustom === "boolean" ? t.allowCustom : d.topup.allowCustom,
      packages,
      autoVerify: typeof t.autoVerify === "boolean" ? t.autoVerify : d.topup.autoVerify,
    },
  };
}

export function normalizeShopOverride(raw: unknown): CreditShopOverride {
  const r = obj(raw);
  const out: CreditShopOverride = {};
  if (typeof r.enabled === "boolean") out.enabled = r.enabled;
  if (r.daily && typeof r.daily === "object") out.daily = obj(r.daily) as Partial<CreditDailyConfig>;
  if (r.lowBalance && typeof r.lowBalance === "object") out.lowBalance = obj(r.lowBalance) as Partial<CreditLowBalanceConfig>;
  return out;
}

/** Merge platform defaults with a shop override. */
export function effectiveConfig(platform: CreditPlatformConfig, override: CreditShopOverride | null): EffectiveCreditConfig {
  const o = override ?? {};
  return {
    enabled: platform.enabled && o.enabled !== false,
    daily: o.daily ? normalizeDaily({ ...platform.daily, ...o.daily }, platform.daily) : platform.daily,
    lowBalance: o.lowBalance ? normalizeLowBalance({ ...platform.lowBalance, ...o.lowBalance }, platform.lowBalance) : platform.lowBalance,
    topup: platform.topup,
  };
}

/** Threshold value in the configured metric's unit (orders or satang). */
export function dailyThreshold(cfg: CreditDailyConfig): number {
  return cfg.metric === "orders" ? cfg.thresholdOrders : cfg.thresholdSatang;
}

/** Value of the day in the configured metric's unit. */
export function dailyMeasure(cfg: CreditDailyConfig, day: { orderCount: number; salesSatang: number }): number {
  return cfg.metric === "orders" ? day.orderCount : day.salesSatang;
}

/** Fee for one closed business day given its counted orders/sales. */
export function dailyCreditFee(cfg: CreditDailyConfig, day: { orderCount: number; salesSatang: number }): number {
  if (cfg.feeSatang <= 0) return 0;
  const v = dailyMeasure(cfg, day), th = dailyThreshold(cfg);
  const hit = cfg.inclusive ? v >= th : v > th;
  return hit ? cfg.feeSatang : 0;
}

/** Cutoff in force for a shop: its own billing cutoff when allowed and set. */
export function creditCutoffFor(cfg: CreditDailyConfig, shopCutoff: string | null | undefined): string {
  return cfg.useShopCutoff && shopCutoff && CUT_RE.test(shopCutoff) ? shopCutoff : cfg.cutoffTime;
}

const BKK_MS = 7 * 3600_000;
const cutMin = (c: string) => Number(c.slice(0, 2)) * 60 + Number(c.slice(3, 5));
export function addDaysYmd(ymd: string, n: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Business day `ymd` = [cutoff on ymd, cutoff on ymd+1) in Asia/Bangkok.
 * With the default 00:00 cutoff that is exactly the Bangkok calendar day.
 */
export function creditDayWindow(ymd: string, cutoffTime: string): { start: Date; end: Date } {
  const [y, mo, d] = ymd.split("-").map(Number);
  const m = cutMin(cutoffTime);
  const start = new Date(Date.UTC(y, mo - 1, d, 0, m) - BKK_MS);
  return { start, end: new Date(Date.UTC(y, mo - 1, d + 1, 0, m) - BKK_MS) };
}

/** Business date (YYYY-MM-DD) containing instant `t`. */
export function creditDayOf(t: Date, cutoffTime: string): string {
  const shifted = new Date(t.getTime() + BKK_MS - cutMin(cutoffTime) * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export type CreditLevel = "ok" | "low" | "empty" | "blocked";

export interface CreditGate {
  allowed: boolean;
  level: CreditLevel;
}

/** May the shop take a NEW order? (Daily model: only the balance matters.) */
export function orderGate(cfg: CreditLowBalanceConfig, balanceSatang: number): CreditGate {
  if (balanceSatang > 0) {
    return { allowed: true, level: balanceSatang <= cfg.warnSatang ? "low" : "ok" };
  }
  if (cfg.mode === "warn") return { allowed: true, level: "empty" };
  if (cfg.negativeLimitSatang > 0 && balanceSatang > -cfg.negativeLimitSatang) return { allowed: true, level: "empty" };
  return { allowed: false, level: "blocked" };
}

export interface TopupQuote {
  packageId: string | null;
  amountSatang: number;
  bonusSatang: number;
}

/** Server-side topup amount + bonus from a package id or a custom amount. */
export function resolveCreditTopup(cfg: CreditTopupConfig, input: { packageId?: string | null; amountSatang?: number | null }): TopupQuote {
  if (input.packageId) {
    const p = cfg.packages.find((x) => x.id === input.packageId);
    if (!p) throw new Error("ไม่พบแพ็กเกจเติมเครดิต");
    return { packageId: p.id, amountSatang: p.amountSatang, bonusSatang: Math.floor((p.amountSatang * p.bonusPercent) / 100) };
  }
  if (!cfg.allowCustom) throw new Error("กรุณาเลือกแพ็กเกจ");
  const amt = Math.round(Number(input.amountSatang));
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
  if (amt < cfg.minSatang) throw new Error(`เติมขั้นต่ำ ${(cfg.minSatang / 100).toFixed(2)} บาท`);
  if (cfg.maxSatang > 0 && amt > cfg.maxSatang) throw new Error(`เติมได้สูงสุด ${(cfg.maxSatang / 100).toFixed(2)} บาท`);
  return { packageId: null, amountSatang: amt, bonusSatang: 0 };
}
