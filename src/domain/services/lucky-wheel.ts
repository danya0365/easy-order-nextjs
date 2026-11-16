import type { SpinPrize, SpinPrizeType } from "@/src/domain/entities";

/** Prize types usable in phase 1 (coupons arrive with checkout discounts in phase 2). */
export const PHASE1_PRIZE_TYPES: readonly SpinPrizeType[] = ["points", "free_item", "gift", "thanks"];

export function isPhase1PrizeType(t: string): t is SpinPrizeType {
  return (PHASE1_PRIZE_TYPES as readonly string[]).includes(t);
}

/** Prize types that produce a staff-redeemable reward code. */
export function prizeNeedsRedeem(t: SpinPrizeType): boolean {
  return t === "free_item" || t === "gift";
}

export interface DrawContext {
  /** Wins today per prize id (Bangkok day). */
  winsToday: Record<string, number>;
  /** Shop's spend-points loyalty is on (points prizes need the ledger). */
  pointsOn: boolean;
}

/**
 * Prizes that can be drawn right now: active, phase-1 type, weight ≥ 1, in stock,
 * under the daily cap, and points prizes only when the points ledger is on.
 */
export function eligiblePrizes(prizes: SpinPrize[], ctx: DrawContext): SpinPrize[] {
  return prizes.filter(
    (p) =>
      p.isActive &&
      isPhase1PrizeType(p.type) &&
      p.weight >= 1 &&
      (p.stock === null || p.stock > 0) &&
      (p.dailyCap === null || (ctx.winsToday[p.id] ?? 0) < p.dailyCap) &&
      (p.type !== "points" || (ctx.pointsOn && (p.pointsAmount ?? 0) > 0)),
  );
}

/**
 * Weighted pick. `rand` is a uniform integer in [0, Σweights) from a CSPRNG
 * (server side). Pure + deterministic for a given rand so it is testable.
 */
export function pickWeighted<T extends { weight: number }>(items: T[], rand: number): T | null {
  const total = items.reduce((a, p) => a + p.weight, 0);
  if (total <= 0 || items.length === 0) return null;
  let r = Math.min(Math.max(0, Math.floor(rand)), total - 1);
  for (const it of items) {
    if (r < it.weight) return it;
    r -= it.weight;
  }
  return items[items.length - 1];
}

/** Odds in percent (one decimal) for display — sums to ~100 over eligible prizes. */
export function prizeOdds(items: { id: string; weight: number }[]): Record<string, number> {
  const total = items.reduce((a, p) => a + p.weight, 0);
  const out: Record<string, number> = {};
  for (const p of items) out[p.id] = total > 0 ? Math.round((p.weight / total) * 1000) / 10 : 0;
  return out;
}

/** "YYYY-MM-DD" in Asia/Bangkok. */
export function bangkokDayKey(now: Date): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** "YYYY-MM" in Asia/Bangkok. */
export function bangkokMonthKey(now: Date): string {
  return bangkokDayKey(now).slice(0, 7);
}

/** True when `now` falls in the last `windowDays` days of its Bangkok month. */
export function inMonthlyWindow(now: Date, windowDays: number): boolean {
  if (windowDays <= 0) return false;
  const [y, m, d] = bangkokDayKey(now).split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d > daysInMonth - Math.min(windowDays, daysInMonth);
}

/** First instant of next Bangkok month (ISO) — monthly tickets expire then. */
export function endOfBangkokMonthISO(now: Date): string {
  const [y, m] = bangkokMonthKey(now).split("-").map(Number);
  return new Date(Date.UTC(y, m, 1) - 7 * 3600_000).toISOString();
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** Human-friendly reward code from random bytes (8 chars, ~40 bits). */
export function rewardCodeFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i % bytes.length] % CODE_ALPHABET.length];
  return s;
}

/** Normalise a typed/scanned code (case, spaces, dashes, or a full URL with ?code=). */
export function normalizeRewardCode(input: string): string {
  const m = /[?&]code=([A-Za-z0-9-]+)/.exec(input);
  const raw = m ? m[1] : input;
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

/** Number of tickets an order earns under the campaign rules. */
export function ticketsForOrder(
  order: { totalSatang: number },
  campaign: { minOrderSatang: number; ticketsPerOrder: number },
): number {
  if (order.totalSatang < campaign.minOrderSatang) return 0;
  return Math.max(0, Math.min(10, Math.floor(campaign.ticketsPerOrder)));
}
