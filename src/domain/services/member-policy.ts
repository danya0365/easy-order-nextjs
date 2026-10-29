/**
 * Per-shop static-QR membership / anti-spam policy. Columns on `shops` are
 * nullable — null means "use the default" (defaults = original constants).
 */
export interface MemberPolicy {
  /** New-member order total cap in THB; 0 = no cap. */
  newMemberOrderCapThb: number;
  /** New-member max open orders until first completed/paid order. */
  newMemberMaxOpenOrders: number;
  /** Signups per device OR IP per shop per 24h. */
  signupsPerDevicePerDay: number;
  /** Max open pending requests per shop. */
  maxPendingRequests: number;
  /** Pending request expiry in hours. */
  pendingExpiryHours: number;
  /** Rejected phone re-register cooldown in days (0 = none). */
  rejectCooldownDays: number;
}

export type MemberPolicyKey = keyof MemberPolicy;

export const MEMBER_POLICY_DEFAULTS: MemberPolicy = {
  newMemberOrderCapThb: 1000,
  newMemberMaxOpenOrders: 1,
  signupsPerDevicePerDay: 3,
  maxPendingRequests: 20,
  pendingExpiryHours: 48,
  rejectCooldownDays: 30,
};

/** Inclusive bounds. Order cap also accepts 0 (= no cap). */
export const MEMBER_POLICY_BOUNDS: Record<MemberPolicyKey, [number, number]> = {
  newMemberOrderCapThb: [100, 100_000],
  newMemberMaxOpenOrders: [1, 5],
  signupsPerDevicePerDay: [1, 20],
  maxPendingRequests: [5, 200],
  pendingExpiryHours: [12, 168],
  rejectCooldownDays: [0, 365],
};

export const MEMBER_POLICY_KEYS = Object.keys(
  MEMBER_POLICY_DEFAULTS,
) as MemberPolicyKey[];

/** Approval before first order is always required (locked ON by spec). */
export const REQUIRE_APPROVAL_FIRST_ORDER = true;

export type MemberPolicyOverrides = { [K in MemberPolicyKey]?: number | null };

export function effectiveMemberPolicy(
  overrides: MemberPolicyOverrides | null | undefined,
): MemberPolicy {
  const out = { ...MEMBER_POLICY_DEFAULTS };
  for (const k of MEMBER_POLICY_KEYS) {
    const v = overrides?.[k];
    if (typeof v === "number" && Number.isFinite(v) && isInBounds(k, v)) {
      out[k] = v;
    }
  }
  return out;
}

export function isInBounds(k: MemberPolicyKey, v: number): boolean {
  if (!Number.isInteger(v)) return false;
  if (k === "newMemberOrderCapThb" && v === 0) return true;
  const [lo, hi] = MEMBER_POLICY_BOUNDS[k];
  return v >= lo && v <= hi;
}

/** Validate a full policy; throws a Thai message naming the first bad field. */
export function validateMemberPolicy(input: MemberPolicy): MemberPolicy {
  for (const k of MEMBER_POLICY_KEYS) {
    const v = input[k];
    if (typeof v !== "number" || !isInBounds(k, v)) {
      const [lo, hi] = MEMBER_POLICY_BOUNDS[k];
      const extra = k === "newMemberOrderCapThb" ? " หรือ 0 = ไม่จำกัด" : "";
      throw new Error(`ค่า ${k} ต้องเป็นจำนวนเต็ม ${lo}–${hi}${extra}`);
    }
  }
  return input;
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
