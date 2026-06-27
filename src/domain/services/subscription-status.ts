import type { ShopStatus, SubscriptionStatus } from "../entities";

export type BillingState = "active" | "overdue" | "suspended" | "paused";

export interface BillingStatus {
  state: BillingState;
  /** Whole days past the due date (0 if not yet due). */
  daysOverdue: number;
  /** Whole days remaining until expiry (0 once expired). */
  daysUntilDue: number;
  /** True when access should be blocked (overdue > grace, or admin-suspended). */
  isSuspended: boolean;
  /** True when the shop is temporarily paused (closed; billing frozen). */
  isPaused: boolean;
  /** 0 = no banner; 1–7 = escalating dunning banner (after expiry). */
  bannerLevel: number;
  /** 0 = none; 1–7 = escalating "expiring soon" nudge (before expiry). */
  preExpiryBannerLevel: number;
  /** Days remaining in the grace window before suspension (0 when suspended). */
  graceDaysLeft: number;
  /** Why the shop is suspended, when it is. */
  suspendReason: "none" | "overdue" | "admin";
  /**
   * While paused: whole days the shop has been closed so far = the days that
   * would be credited back if it resumed now (0 when not paused, or paused
   * under a full day). Surfaced in the UI so owners see what reopening refunds.
   */
  frozenDaysSoFar: number;
}

/** Number of days a shop may remain expired before the system blocks it. */
export const GRACE_DAYS = 7;

/** Days before expiry within which we start nudging the owner to top up. */
export const PRE_EXPIRY_WARN_DAYS = 7;

/** Pause policy: how many times a shop may close per rolling window, the window,
 * and the minimum gap between closures. Shared by the enforcing action and the
 * UI that explains/shows the quota. */
export const PAUSE_MAX_PER_30D = 8;
export const PAUSE_CAP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน
export const PAUSE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 ชม.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days a pause has lasted so far — what resuming now credits back. */
export function frozenWholeDays(pausedAtISO: string, now: Date): number {
  const ms = now.getTime() - new Date(pausedAtISO).getTime();
  return ms > 0 ? Math.floor(ms / DAY_MS) : 0;
}

export interface BillingInput {
  /** ISO-8601 due date of the current billing period. */
  currentPeriodDueAt: string;
  /** Stored subscription status (cache; the due date is authoritative). */
  status?: SubscriptionStatus;
  /** Manual platform suspension overrides everything. */
  shopStatus?: ShopStatus;
  /** When set, the shop is paused: billing is frozen at this instant. */
  pausedAt?: string | null;
}

/**
 * New due date after resuming from a pause: push the original due date forward
 * by the paused duration — but credited only in WHOLE days (floor). Pausing for
 * less than a full day (overnight, rapid toggle) refunds nothing, so a shop
 * can't stretch one paid day across many calendar days by closing off-hours;
 * pausing only pays off for genuine multi-day closures (holidays/renovation).
 */
export function resumeDueDate(
  dueISO: string,
  pausedAtISO: string,
  now: Date,
): string {
  const wholeDays = frozenWholeDays(pausedAtISO, now);
  return new Date(
    new Date(dueISO).getTime() + wholeDays * DAY_MS,
  ).toISOString();
}

/**
 * Pure, deterministic billing-state computation. Suspension and dunning are
 * derived from the due date vs `now` — no cron, no stored flags required.
 */
export function computeBillingState(input: BillingInput, now: Date): BillingStatus {
  if (input.shopStatus === "suspended_by_admin") {
    return {
      state: "suspended",
      daysOverdue: 0,
      daysUntilDue: 0,
      isSuspended: true,
      isPaused: false,
      bannerLevel: 0,
      preExpiryBannerLevel: 0,
      graceDaysLeft: 0,
      suspendReason: "admin",
      frozenDaysSoFar: 0,
    };
  }

  // Paused: clock frozen at pausedAt — no day consumed, no dunning/suspension.
  if (input.pausedAt) {
    const dueMs = new Date(input.currentPeriodDueAt).getTime();
    const pausedMs = new Date(input.pausedAt).getTime();
    const daysUntilDue = Math.max(0, Math.ceil((dueMs - pausedMs) / DAY_MS));
    return {
      state: "paused",
      daysOverdue: 0,
      daysUntilDue,
      isSuspended: false,
      isPaused: true,
      bannerLevel: 0,
      preExpiryBannerLevel: 0,
      graceDaysLeft: GRACE_DAYS,
      suspendReason: "none",
      frozenDaysSoFar: frozenWholeDays(input.pausedAt, now),
    };
  }

  const due = new Date(input.currentPeriodDueAt).getTime();
  const diffMs = now.getTime() - due;
  const daysOverdue = diffMs <= 0 ? 0 : Math.floor(diffMs / DAY_MS);

  if (daysOverdue === 0) {
    // Still active: how many whole days of usage remain (ceil so it shows ≥1
    // until the moment of expiry), and whether to nudge before it lapses.
    const daysUntilDue = Math.max(0, Math.ceil(-diffMs / DAY_MS));
    const preExpiryBannerLevel =
      daysUntilDue > 0 && daysUntilDue <= PRE_EXPIRY_WARN_DAYS
        ? PRE_EXPIRY_WARN_DAYS - daysUntilDue + 1
        : 0;
    return {
      state: "active",
      daysOverdue: 0,
      daysUntilDue,
      isSuspended: false,
      isPaused: false,
      bannerLevel: 0,
      preExpiryBannerLevel,
      graceDaysLeft: GRACE_DAYS,
      suspendReason: "none",
      frozenDaysSoFar: 0,
    };
  }

  if (daysOverdue > GRACE_DAYS) {
    return {
      state: "suspended",
      daysOverdue,
      daysUntilDue: 0,
      isSuspended: true,
      isPaused: false,
      bannerLevel: GRACE_DAYS,
      preExpiryBannerLevel: 0,
      graceDaysLeft: 0,
      suspendReason: "overdue",
      frozenDaysSoFar: 0,
    };
  }

  return {
    state: "overdue",
    daysOverdue,
    daysUntilDue: 0,
    isSuspended: false,
    isPaused: false,
    bannerLevel: daysOverdue,
    preExpiryBannerLevel: 0,
    graceDaysLeft: GRACE_DAYS - daysOverdue,
    suspendReason: "none",
    frozenDaysSoFar: 0,
  };
}
