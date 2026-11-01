/**
 * Order-threshold DAILY FEE billing — pure rules (no I/O).
 *
 * A shop's "business day" runs from one cutoff (wall-clock HH:MM in
 * Asia/Bangkok) to the next. A closed day whose billable (non-cancelled) order
 * count is STRICTLY greater than the threshold incurs a flat fee. Terms
 * (enabled / threshold / fee / cutoff) are taken as they stood at the START of
 * the business day, so admin changes only ever affect the next business day and
 * past days are never recomputed.
 *
 * Each day carries a label `businessDate` = Bangkok date of (start + 12h). With
 * the default 04:00 cutoff that is simply the calendar date the day starts on.
 * Day ends are chosen so labels strictly increase — `(shop, businessDate)` is
 * unique even across cutoff changes (a transition day lasts 12–36h).
 */

export const BANGKOK_OFFSET_MS = 7 * 3600_000;
const HALF_DAY_MS = 12 * 3600_000;
const DAY_MS = 24 * 3600_000;

export interface DailyFeeTerms {
  enabled: boolean;
  /** Fee applies when billable orders > threshold. */
  threshold: number;
  feeSatang: number;
  /** "HH:MM" Asia/Bangkok. */
  cutoffTime: string;
}

export const DEFAULT_DAILY_FEE_TERMS: DailyFeeTerms = {
  enabled: false,
  threshold: 50,
  feeSatang: 500,
  cutoffTime: "04:00",
};

/** One row of the terms change log. shopId null = platform-wide terms. */
export interface DailyFeeTermsVersion {
  shopId: string | null;
  effectiveAt: string; // ISO
  enabled: boolean;
  threshold: number;
  feeSatang: number;
  /** Platform rows: the default cutoff. Shop rows: override (null = platform default). */
  cutoffTime: string | null;
}

const CUTOFF_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidCutoff(v: string): boolean {
  return CUTOFF_RE.test(v);
}

/** "HH:MM" → minutes after midnight. Throws a Thai error on bad input. */
export function cutoffMinutes(v: string): number {
  const m = CUTOFF_RE.exec(v);
  if (!m) throw new Error("เวลาตัดรอบต้องเป็นรูปแบบ HH:MM");
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Bangkok calendar date (YYYY-MM-DD) of an instant. */
export function bangkokDate(t: Date): string {
  return new Date(t.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant of `HH:MM` Bangkok on Bangkok date `ymd`. */
function cutoffInstant(ymd: string, minutes: number): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 0, minutes) - BANGKOK_OFFSET_MS);
}

function addDays(ymd: string, n: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}

/** Label of a business day starting at `start`. */
export function businessDateOf(start: Date): string {
  return bangkokDate(new Date(start.getTime() + HALF_DAY_MS));
}

/** Latest cutoff instant ≤ t (start of the business day containing t). */
export function dayStartContaining(t: Date, cutoffTime: string): Date {
  const min = cutoffMinutes(cutoffTime);
  const today = bangkokDate(t);
  const c = cutoffInstant(today, min);
  return c.getTime() <= t.getTime() ? c : cutoffInstant(addDays(today, -1), min);
}

/**
 * End of the business day that starts at `start`, using the cutoff in force
 * at that start: the first cutoff instant after `start` whose day label is
 * greater than this day's label.
 */
export function dayEnd(start: Date, cutoffTime: string): Date {
  const min = cutoffMinutes(cutoffTime);
  const label = businessDateOf(start);
  let ymd = addDays(bangkokDate(start), -1);
  for (let i = 0; i < 5; i++) {
    const c = cutoffInstant(ymd, min);
    if (c.getTime() > start.getTime() && businessDateOf(c) > label) return c;
    ymd = addDays(ymd, 1);
  }
  // Unreachable for valid cutoffs; keep a sane fallback.
  return new Date(start.getTime() + DAY_MS);
}

/** Terms in force for `shopId` at instant `t` (latest versions effective ≤ t). */
export function termsAt(
  versions: DailyFeeTermsVersion[],
  shopId: string,
  t: Date,
): DailyFeeTerms {
  const at = t.toISOString();
  let platform: DailyFeeTermsVersion | null = null;
  let shop: DailyFeeTermsVersion | null = null;
  for (const v of versions) {
    if (v.effectiveAt > at) continue;
    if (v.shopId === null) {
      if (!platform || v.effectiveAt >= platform.effectiveAt) platform = v;
    } else if (v.shopId === shopId) {
      if (!shop || v.effectiveAt >= shop.effectiveAt) shop = v;
    }
  }
  const base: DailyFeeTerms = platform
    ? {
        enabled: platform.enabled,
        threshold: platform.threshold,
        feeSatang: platform.feeSatang,
        cutoffTime: platform.cutoffTime ?? DEFAULT_DAILY_FEE_TERMS.cutoffTime,
      }
    : { ...DEFAULT_DAILY_FEE_TERMS };
  if (shop?.cutoffTime) base.cutoffTime = shop.cutoffTime;
  return base;
}

/** Fee for one business day under its snapshotted terms. Strictly greater. */
export function dailyFeeFor(orderCount: number, terms: DailyFeeTerms): number {
  return terms.enabled && orderCount > terms.threshold ? terms.feeSatang : 0;
}

export interface BusinessDay {
  businessDate: string;
  start: Date;
  end: Date;
  terms: DailyFeeTerms;
}

/** The business day starting at `start` with the terms in force then. */
export function businessDayFrom(
  versions: DailyFeeTermsVersion[],
  shopId: string,
  start: Date,
): BusinessDay {
  const terms = termsAt(versions, shopId, start);
  return { businessDate: businessDateOf(start), start, end: dayEnd(start, terms.cutoffTime), terms };
}

/**
 * Where billing starts for a shop with no charge rows yet: the business day
 * containing max(shop created, first time daily fees were ever enabled).
 * Null = daily fees were never enabled → nothing to bill.
 */
export function firstBillingDayStart(
  versions: DailyFeeTermsVersion[],
  shopId: string,
  shopCreatedAt: string,
): Date | null {
  const firstOn = versions
    .filter((v) => v.shopId === null && v.enabled)
    .map((v) => v.effectiveAt)
    .sort()[0];
  if (!firstOn) return null;
  const from = new Date(firstOn > shopCreatedAt ? firstOn : shopCreatedAt);
  return dayStartContaining(from, termsAt(versions, shopId, from).cutoffTime);
}
