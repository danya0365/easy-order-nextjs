/**
 * Prepaid CREDIT wallet — pure rules (no I/O).
 *
 * A shop holds a baht balance (satang). Orders deduct credit according to a
 * configurable fee rule; cancelled orders are refunded; the shop tops up via
 * PromptPay slips reviewed by an admin. Everything is driven by a JSON config:
 * platform defaults + optional per-shop overrides (deduction / low-balance).
 *
 * Independent of the legacy day-subscription and daily-fee billing — each has
 * its own master switch.
 */

export const CREDIT_DEDUCTION_MODES = ["fixed", "percent", "fixed_percent", "tiered"] as const;
export type CreditDeductionMode = (typeof CREDIT_DEDUCTION_MODES)[number];

export const CREDIT_TRIGGERS = ["placed", "accepted", "completed"] as const;
export type CreditTrigger = (typeof CREDIT_TRIGGERS)[number];

export const CREDIT_LOW_MODES = ["warn", "block", "grace"] as const;
export type CreditLowMode = (typeof CREDIT_LOW_MODES)[number];

export const CREDIT_ENTRY_TYPES = ["topup", "deduction", "refund", "adjust", "bonus", "starting"] as const;
export type CreditEntryType = (typeof CREDIT_ENTRY_TYPES)[number];

export interface CreditTier {
  /** Applies to orders with total >= this (satang). */
  minTotalSatang: number;
  feeSatang: number;
}

export interface CreditDeductionConfig {
  mode: CreditDeductionMode;
  fixedSatang: number;
  /** Percent of the order total, e.g. 2.5 = 2.5 %. */
  percent: number;
  tiers: CreditTier[];
  /** 0 = no floor / no cap. */
  minSatang: number;
  maxSatang: number;
  /** Free (uncharged) orders per Bangkok day / month. 0 = none. */
  freePerDay: number;
  freePerMonth: number;
  trigger: CreditTrigger;
  refundOnCancel: boolean;
  /** Fee base: full total (incl. delivery fee) or items subtotal. */
  basis: "total" | "subtotal";
}

export interface CreditLowBalanceConfig {
  /** Warn when balance <= this (satang). */
  warnSatang: number;
  /** Behaviour once balance <= 0. */
  mode: CreditLowMode;
  /** grace: orders still allowed after reaching <= 0 (0 = unlimited by count). */
  graceOrders: number;
  /** grace: allow down to -negativeLimitSatang (0 = no negative limit). */
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
  deduction: CreditDeductionConfig;
  lowBalance: CreditLowBalanceConfig;
  topup: CreditTopupConfig;
}

/** Per-shop override: any subset of deduction / lowBalance, plus a kill switch. */
export interface CreditShopOverride {
  /** false = this shop is exempt (never charged / blocked). */
  enabled?: boolean;
  deduction?: Partial<CreditDeductionConfig>;
  lowBalance?: Partial<CreditLowBalanceConfig>;
}

export interface EffectiveCreditConfig {
  enabled: boolean;
  deduction: CreditDeductionConfig;
  lowBalance: CreditLowBalanceConfig;
  topup: CreditTopupConfig;
}

export const DEFAULT_CREDIT_CONFIG: CreditPlatformConfig = {
  enabled: false,
  startingCreditSatang: 0,
  deduction: {
    mode: "fixed",
    fixedSatang: 100,
    percent: 0,
    tiers: [],
    minSatang: 0,
    maxSatang: 0,
    freePerDay: 0,
    freePerMonth: 0,
    trigger: "completed",
    refundOnCancel: true,
    basis: "total",
  },
  lowBalance: { warnSatang: 5000, mode: "warn", graceOrders: 0, negativeLimitSatang: 0 },
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

export function normalizeDeduction(raw: unknown, base = DEFAULT_CREDIT_CONFIG.deduction): CreditDeductionConfig {
  const r = obj(raw);
  const tiers = Array.isArray(r.tiers)
    ? (r.tiers as unknown[])
        .map((t) => ({ minTotalSatang: int(obj(t).minTotalSatang, 0), feeSatang: int(obj(t).feeSatang, 0) }))
        .sort((a, b) => a.minTotalSatang - b.minTotalSatang)
        .slice(0, 20)
    : base.tiers;
  return {
    mode: pick(r.mode, CREDIT_DEDUCTION_MODES, base.mode),
    fixedSatang: int(r.fixedSatang ?? base.fixedSatang, base.fixedSatang),
    percent: num(r.percent ?? base.percent, base.percent),
    tiers,
    minSatang: int(r.minSatang ?? base.minSatang, base.minSatang),
    maxSatang: int(r.maxSatang ?? base.maxSatang, base.maxSatang),
    freePerDay: int(r.freePerDay ?? base.freePerDay, base.freePerDay, 0, 100_000),
    freePerMonth: int(r.freePerMonth ?? base.freePerMonth, base.freePerMonth, 0, 1_000_000),
    trigger: pick(r.trigger, CREDIT_TRIGGERS, base.trigger),
    refundOnCancel: typeof r.refundOnCancel === "boolean" ? r.refundOnCancel : base.refundOnCancel,
    basis: pick(r.basis, ["total", "subtotal"] as const, base.basis),
  };
}

export function normalizeLowBalance(raw: unknown, base = DEFAULT_CREDIT_CONFIG.lowBalance): CreditLowBalanceConfig {
  const r = obj(raw);
  return {
    warnSatang: int(r.warnSatang ?? base.warnSatang, base.warnSatang),
    mode: pick(r.mode, CREDIT_LOW_MODES, base.mode),
    graceOrders: int(r.graceOrders ?? base.graceOrders, base.graceOrders, 0, 100_000),
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
    deduction: normalizeDeduction(r.deduction),
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
  if (r.deduction && typeof r.deduction === "object") out.deduction = obj(r.deduction) as Partial<CreditDeductionConfig>;
  if (r.lowBalance && typeof r.lowBalance === "object") out.lowBalance = obj(r.lowBalance) as Partial<CreditLowBalanceConfig>;
  return out;
}

/** Merge platform defaults with a shop override. */
export function effectiveConfig(platform: CreditPlatformConfig, override: CreditShopOverride | null): EffectiveCreditConfig {
  const o = override ?? {};
  return {
    enabled: platform.enabled && o.enabled !== false,
    deduction: o.deduction ? normalizeDeduction({ ...platform.deduction, ...o.deduction }, platform.deduction) : platform.deduction,
    lowBalance: o.lowBalance ? normalizeLowBalance({ ...platform.lowBalance, ...o.lowBalance }, platform.lowBalance) : platform.lowBalance,
    topup: platform.topup,
  };
}

/** Raw (pre-clamp) fee for an order total under a rule. */
function rawFee(cfg: CreditDeductionConfig, totalSatang: number): number {
  const pct = Math.round((totalSatang * cfg.percent) / 100);
  switch (cfg.mode) {
    case "fixed":
      return cfg.fixedSatang;
    case "percent":
      return pct;
    case "fixed_percent":
      return cfg.fixedSatang + pct;
    case "tiered": {
      let fee = 0;
      for (const t of cfg.tiers) if (totalSatang >= t.minTotalSatang) fee = t.feeSatang;
      return fee;
    }
  }
}

export interface DeductionQuote {
  amountSatang: number;
  /** True when covered by the free daily/monthly quota. */
  free: boolean;
  reason: string;
}

/**
 * Credit to deduct for one order. `usedToday` / `usedMonth` = orders already
 * counted (charged OR free) this Bangkok day / month, excluding this one.
 */
export function computeDeduction(
  cfg: CreditDeductionConfig,
  totalSatang: number,
  usedToday = 0,
  usedMonth = 0,
): DeductionQuote {
  if (cfg.freePerDay > 0 && usedToday < cfg.freePerDay) {
    return { amountSatang: 0, free: true, reason: `free_day ${usedToday + 1}/${cfg.freePerDay}` };
  }
  if (cfg.freePerMonth > 0 && usedMonth < cfg.freePerMonth) {
    return { amountSatang: 0, free: true, reason: `free_month ${usedMonth + 1}/${cfg.freePerMonth}` };
  }
  let fee = Math.max(0, rawFee(cfg, Math.max(0, totalSatang)));
  if (cfg.minSatang > 0) fee = Math.max(fee, cfg.minSatang);
  if (cfg.maxSatang > 0) fee = Math.min(fee, cfg.maxSatang);
  return { amountSatang: fee, free: false, reason: cfg.mode };
}

/** Which order transition triggers the deduction. */
export function triggerFor(status: "pending" | "preparing" | "ready" | "completed" | "cancelled"): CreditTrigger | null {
  if (status === "pending") return "placed";
  if (status === "preparing") return "accepted";
  if (status === "completed") return "completed";
  return null;
}

/**
 * Should a deduction fire for an order that just reached `status`? For
 * "accepted", an order that skipped preparing (e.g. straight to completed) is
 * still charged at the later step — idempotency guarantees it happens once.
 */
export function shouldDeductAt(trigger: CreditTrigger, status: string): boolean {
  if (status === "cancelled") return false;
  const rank: Record<string, number> = { pending: 0, preparing: 1, ready: 2, completed: 3 };
  const need: Record<CreditTrigger, number> = { placed: 0, accepted: 1, completed: 3 };
  return (rank[status] ?? -1) >= need[trigger];
}

export type CreditLevel = "ok" | "low" | "empty" | "blocked";

export interface CreditGate {
  allowed: boolean;
  level: CreditLevel;
}

/**
 * May the shop take a NEW order? `graceUsed` = orders charged since the
 * balance last dropped to <= 0.
 */
export function orderGate(cfg: CreditLowBalanceConfig, balanceSatang: number, graceUsed = 0): CreditGate {
  if (balanceSatang > 0) {
    return { allowed: true, level: balanceSatang <= cfg.warnSatang ? "low" : "ok" };
  }
  if (cfg.mode === "warn") return { allowed: true, level: "empty" };
  if (cfg.mode === "block") return { allowed: false, level: "blocked" };
  // grace
  const limitByCount = cfg.graceOrders > 0;
  const limitByNeg = cfg.negativeLimitSatang > 0;
  if (!limitByCount && !limitByNeg) return { allowed: false, level: "blocked" };
  if (limitByCount && graceUsed >= cfg.graceOrders) return { allowed: false, level: "blocked" };
  if (limitByNeg && balanceSatang <= -cfg.negativeLimitSatang) return { allowed: false, level: "blocked" };
  return { allowed: true, level: "empty" };
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

const BKK = 7 * 3600_000;
/** Bangkok-day and Bangkok-month start instants (ISO) for `now`. */
export function bangkokPeriodStarts(now: Date): { dayStart: string; monthStart: string } {
  const b = new Date(now.getTime() + BKK);
  const day = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - BKK;
  const month = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 1) - BKK;
  return { dayStart: new Date(day).toISOString(), monthStart: new Date(month).toISOString() };
}
