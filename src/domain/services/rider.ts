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

/** Rider-driven job actions. `cod_delivered` = collect cash and deliver in one step. */
export type RiderJobAction = "picked_up" | "delivered" | "cod" | "cod_delivered";

/** Facts about an order a rider action is checked against (pure). */
export interface RiderJobFacts {
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  paymentMethod: "promptpay_qr" | "cash";
  paymentStatus: "unpaid" | "paid";
  deliveryStatus: DeliveryStatus | null;
  codCollected: boolean;
}

/** Cash the rider must collect at the door (cash order not yet paid/collected). */
export function needsCodCollection(o: Pick<RiderJobFacts, "paymentMethod" | "paymentStatus" | "codCollected">): boolean {
  return o.paymentMethod === "cash" && o.paymentStatus !== "paid" && !o.codCollected;
}

/**
 * Cash a delivered order puts in the rider's hands (owed back to the shop):
 * collected COD, or a cash order still unpaid after delivery (legacy rows
 * delivered before the collect-first rule).
 */
export function riderCashDue(o: Pick<RiderJobFacts, "paymentMethod" | "paymentStatus" | "codCollected">): boolean {
  return o.codCollected || (o.paymentMethod === "cash" && o.paymentStatus !== "paid");
}

/** Shop has accepted the order (rider may pick it up). */
export function shopAccepted(status: RiderJobFacts["status"]): boolean {
  return status === "preparing" || status === "ready" || status === "completed";
}

/**
 * Why a rider action is not allowed right now (Thai, shown to the rider), or
 * null when allowed. Rules: shop must accept before pickup; a COD order must
 * have its cash collected before it can be marked delivered.
 */
export function riderActionBlockReason(o: RiderJobFacts, action: RiderJobAction): string | null {
  if (o.status === "cancelled") return "ออเดอร์ถูกยกเลิกแล้ว";
  if (!shopAccepted(o.status)) return "ร้านยังไม่ได้รับออเดอร์ — รอร้านกดรับก่อน";
  if (action === "cod") {
    if (o.paymentMethod !== "cash") return "ออเดอร์นี้ไม่ใช่เก็บเงินปลายทาง";
    if (o.deliveryStatus !== "picked_up" && o.deliveryStatus !== "delivered") return "ต้องรับของก่อน";
    return null;
  }
  if (action === "cod_delivered") {
    if (o.paymentMethod !== "cash") return "ออเดอร์นี้ไม่ใช่เก็บเงินปลายทาง";
    return canAdvanceDelivery(o.deliveryStatus, "delivered") ? null : "เปลี่ยนสถานะไม่ได้";
  }
  if (!canAdvanceDelivery(o.deliveryStatus, action)) return "เปลี่ยนสถานะไม่ได้";
  if (action === "delivered" && needsCodCollection(o)) {
    return "ต้องเก็บเงินสดจากลูกค้าก่อน จึงจะกดส่งแล้วได้";
  }
  return null;
}
