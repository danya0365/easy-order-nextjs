/**
 * Rider (shop-owned delivery) pure rules — commission, delivery-status
 * transitions, and the personal-link token hashing. No I/O.
 */
import { createHash, randomBytes } from "node:crypto";
export { lineChatUrl } from "./rider-contact";

export const RIDER_COMMISSION_TYPES = ["per_trip", "percent_fee", "full_fee"] as const;
export type RiderCommissionType = (typeof RIDER_COMMISSION_TYPES)[number];

export const DELIVERY_STATUSES = ["assigned", "picked_up", "delivered"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * Commission (satang) a rider earns for one trip, snapshotted at assign time.
 * - per_trip: `value` is a fixed satang amount
 * - percent_fee: `value` is a percent (0–100) of the order's delivery fee
 * - full_fee: the whole delivery fee (value ignored)
 */
export function computeRiderCommission(
  type: RiderCommissionType,
  value: number,
  deliveryFeeSatang: number,
): number {
  const fee = Math.max(0, Math.floor(deliveryFeeSatang));
  switch (type) {
    case "per_trip":
      return Math.max(0, Math.floor(value));
    case "percent_fee":
      return Math.floor((fee * Math.min(100, Math.max(0, value))) / 100);
    case "full_fee":
      return fee;
  }
}

/** Validate commission input; throws a Thai message on bad input. */
export function assertValidCommission(type: string, value: number): asserts type is RiderCommissionType {
  if (!(RIDER_COMMISSION_TYPES as readonly string[]).includes(type)) {
    throw new Error("รูปแบบค่าคอมมิชชั่นไม่ถูกต้อง");
  }
  if (!Number.isFinite(value) || value < 0) throw new Error("ค่าคอมมิชชั่นต้องไม่ติดลบ");
  if (type === "percent_fee" && value > 100) throw new Error("เปอร์เซ็นต์ต้องไม่เกิน 100");
}

/** Allowed rider-driven delivery transitions (forward-only). */
export function canAdvanceDelivery(from: DeliveryStatus | null, to: DeliveryStatus): boolean {
  if (from === "assigned") return to === "picked_up";
  if (from === "picked_up") return to === "delivered";
  return false;
}

/** Reassign is only allowed before the rider picked the food up. */
export function canReassign(current: DeliveryStatus | null): boolean {
  return current === null || current === "assigned";
}

/** New random personal-link token (url-safe, 32 bytes). */
export function generateRiderToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex of a rider token — only this is stored. */
export function hashRiderToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Plausible token shape (reject junk before hitting the DB). */
export function isRiderTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

/** Normalise an optional LINE ID ("" → null). Throws on invalid characters. */
export function normalizeLineId(input: string | null | undefined): string | null {
  const v = (input ?? "").trim().replace(/^~/, "");
  if (!v) return null;
  if (!/^[A-Za-z0-9._@-]{1,50}$/.test(v)) throw new Error("LINE ID ไม่ถูกต้อง");
  return v;
}

/** Customer-facing first name only. */
export function riderFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
