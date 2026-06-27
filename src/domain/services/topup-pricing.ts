/**
 * Pure, deterministic pricing for the prepaid "day top-up" model.
 *
 * Two ways to top up:
 *  - a preset package (fixed price + bonus days), or
 *  - a custom number of days at the shop's per-day rate, with a tiered bonus.
 *
 * The amount is ALWAYS computed here from a package id or a day count — the
 * client never supplies a price. Mirrors the pure style of subscription-status.ts.
 */

export interface TopupPackage {
  /** Stable id, stored on the payment so historical orders stay accurate. */
  id: string;
  /** Base paid days. Price is derived as `days × shop's pricePerDaySatang`. */
  days: number;
  /** Free days granted on top of `days`. */
  bonusDays: number;
  /** Marketing badge shown on the card. */
  badge?: "popular" | "best_value";
}

/** Default per-day rate: ฿10/วัน → ~฿300/เดือน (≈ the previous ฿299 monthly). */
export const DEFAULT_PRICE_PER_DAY_SATANG = 1000;

export interface PromoConfig {
  active: boolean;
  /** Whole-percent discount applied to every top-up price. */
  percentOff: number;
}

/**
 * Hardcoded launch promo. To END the promo, set `active: false` and redeploy —
 * every price reverts to full automatically (single source: resolveTopupQuote).
 * The banner copy lives in the i18n catalog (`billing.promoLabel`, keyed off
 * `percentOff`) — this stays a pure config.
 */
export const TOPUP_PROMO: PromoConfig = {
  active: true,
  percentOff: 50,
};

export function isPromoActive(promo: PromoConfig = TOPUP_PROMO): boolean {
  return promo.active && promo.percentOff > 0;
}

function discounted(fullSatang: number, promo: PromoConfig): number {
  if (!isPromoActive(promo)) return fullSatang;
  return Math.round(fullSatang * (1 - promo.percentOff / 100));
}

export const MIN_CUSTOM_DAYS = 1;
/** Cap a single top-up at 3 years. */
export const MAX_CUSTOM_DAYS = 1095;

/** Window (days before expiry) within which we nudge the owner to top up. */
export const PRE_EXPIRY_WARN_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Preset packages. Price is computed as `days × the shop's pricePerDaySatang`
 * (see resolveTopupQuote), so each shop's rate flows through to presets too.
 * Longer packages earn progressively more bonus days — the anchors we want
 * owners to choose.
 */
export const TOPUP_PRESETS: readonly TopupPackage[] = [
  { id: "d30", days: 30, bonusDays: 0 },
  { id: "d90", days: 90, bonusDays: 7 },
  { id: "d180", days: 180, bonusDays: 20, badge: "popular" },
  { id: "d365", days: 365, bonusDays: 45, badge: "best_value" },
];

export function findPreset(id: string): TopupPackage | null {
  return TOPUP_PRESETS.find((p) => p.id === id) ?? null;
}

/**
 * Tiered bonus for CUSTOM day counts. Thresholds align with the presets so a
 * custom 150-day order matches the spirit of the "5 months + 1 month free" deal.
 */
export function computeCustomBonusDays(days: number): number {
  if (days >= 365) return 45;
  if (days >= 150) return 30;
  if (days >= 90) return 7;
  return 0;
}

export interface TopupQuote {
  /** Preset id, or null for a custom-day order. */
  packageId: string | null;
  /** Base days purchased. */
  baseDays: number;
  /** Free bonus days granted. */
  bonusDays: number;
  /** baseDays + bonusDays — the actual days added to the shop. */
  totalDays: number;
  /** Server-trusted charge in satang (already discounted when a promo is on). */
  amountSatang: number;
  /** Pre-promo list price in satang (for strikethrough display). */
  fullAmountSatang: number;
  /** Discount applied, in whole percent (0 when no promo). */
  promoPercentOff: number;
}

/**
 * Resolve any order (preset id OR custom days) into a normalized, server-trusted
 * quote. Applies the active promo discount to BOTH presets and custom day counts.
 * Throws on an unknown package id or an out-of-range day count.
 */
export function resolveTopupQuote(
  input: { packageId?: string | null; customDays?: number | null },
  pricePerDaySatang: number,
  promo: PromoConfig = TOPUP_PROMO,
): TopupQuote {
  const rate =
    Number.isFinite(pricePerDaySatang) && pricePerDaySatang > 0
      ? Math.round(pricePerDaySatang)
      : DEFAULT_PRICE_PER_DAY_SATANG;
  const promoPercentOff = isPromoActive(promo) ? promo.percentOff : 0;

  if (input.packageId) {
    const preset = findPreset(input.packageId);
    if (!preset) throw new Error("ไม่พบแพ็กเกจที่เลือก");
    // Price derives from the shop's per-day rate, like a custom order — the
    // bonus days are the only "deal".
    const fullAmountSatang = preset.days * rate;
    return {
      packageId: preset.id,
      baseDays: preset.days,
      bonusDays: preset.bonusDays,
      totalDays: preset.days + preset.bonusDays,
      amountSatang: discounted(fullAmountSatang, promo),
      fullAmountSatang,
      promoPercentOff,
    };
  }

  const days = Math.floor(Number(input.customDays));
  if (!Number.isFinite(days) || days < MIN_CUSTOM_DAYS) {
    throw new Error(`จำนวนวันต้องอย่างน้อย ${MIN_CUSTOM_DAYS} วัน`);
  }
  if (days > MAX_CUSTOM_DAYS) {
    throw new Error(`จำนวนวันสูงสุดต่อครั้งคือ ${MAX_CUSTOM_DAYS} วัน`);
  }
  const bonusDays = computeCustomBonusDays(days);
  const fullAmountSatang = days * rate;
  return {
    packageId: null,
    baseDays: days,
    bonusDays,
    totalDays: days + bonusDays,
    amountSatang: discounted(fullAmountSatang, promo),
    fullAmountSatang,
    promoPercentOff,
  };
}

/**
 * Savings vs. paying for `totalDays` at the plain per-day rate, as a whole
 * percent (the value of the free bonus days + any package discount). 0 if none.
 */
export function computeSavingsPercent(
  quote: TopupQuote,
  pricePerDaySatang: number,
): number {
  const rate =
    pricePerDaySatang > 0 ? pricePerDaySatang : DEFAULT_PRICE_PER_DAY_SATANG;
  const fullValue = quote.totalDays * rate;
  if (fullValue <= 0) return 0;
  const saved = fullValue - quote.amountSatang;
  if (saved <= 0) return 0;
  return Math.round((saved / fullValue) * 100);
}

/**
 * New expiry after adding `totalDays`. Stacking rule: extend from the LATER of
 * now / current expiry — topping up early never wastes remaining days; topping
 * up after the shop has lapsed simply starts the new days from now.
 */
export function computeNewExpiry(
  currentExpiryISO: string,
  totalDays: number,
  now: Date,
): string {
  const current = new Date(currentExpiryISO).getTime();
  const from = Math.max(
    now.getTime(),
    Number.isFinite(current) ? current : now.getTime(),
  );
  return new Date(from + totalDays * DAY_MS).toISOString();
}
