import type { OrderWithItems, Rider, RiderPayoutRow } from "@/src/domain/entities";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type {
  IRiderRepository,
  RiderInput,
} from "@/src/application/repositories/IRiderRepository";
import {
  assertValidCommission,
  canAdvanceDelivery,
  canReassign,
  computeRiderCommission,
  generateRiderToken,
  hashRiderToken,
  isRiderTokenShape,
  normalizeLineId,
} from "@/src/domain/services/rider";

function cleanInput(input: RiderInput): RiderInput {
  const name = input.name.trim().slice(0, 80);
  const phone = input.phone.replace(/[^\d+]/g, "").slice(0, 20);
  if (name.length < 1) throw new Error("กรุณาใส่ชื่อไรเดอร์");
  if (phone.replace(/\D/g, "").length < 9) throw new Error("เบอร์โทรไม่ถูกต้อง");
  const commissionValue = Math.floor(Number(input.commissionValue) || 0);
  assertValidCommission(input.commissionType, commissionValue);
  return {
    name,
    phone,
    commissionType: input.commissionType,
    commissionValue,
    lineId: normalizeLineId(input.lineId),
  };
}

export class CreateRiderUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  execute(shopId: string, input: RiderInput): Promise<Rider> {
    return this.riders.create(shopId, cleanInput(input));
  }
}

export class UpdateRiderUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  async execute(
    shopId: string,
    riderId: string,
    input: RiderInput & { active: boolean },
  ): Promise<Rider> {
    const existing = await this.riders.findById(shopId, riderId);
    if (!existing) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
    return this.riders.update(shopId, riderId, {
      ...cleanInput(input),
      active: !!input.active,
    });
  }
}

/** Issue a new personal link (revokes the previous one). Returns the raw token ONCE. */
export class RegenerateRiderLinkUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  async execute(shopId: string, riderId: string): Promise<string> {
    const existing = await this.riders.findById(shopId, riderId);
    if (!existing) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
    const token = generateRiderToken();
    await this.riders.setTokenHash(shopId, riderId, hashRiderToken(token));
    return token;
  }
}

export class RevokeRiderLinkUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  async execute(shopId: string, riderId: string): Promise<void> {
    await this.riders.setTokenHash(shopId, riderId, null);
  }
}

/** Owner assigns/reassigns one of THEIR OWN active riders to a delivery order. */
export class AssignRiderUseCase {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly riders: IRiderRepository,
  ) {}
  async execute(shopId: string, orderId: string, riderId: string): Promise<OrderWithItems> {
    const order = await this.orders.findById(shopId, orderId);
    if (!order) throw new Error("ไม่พบออเดอร์ในร้านนี้");
    if (order.fulfillmentType !== "delivery") throw new Error("ออเดอร์นี้ไม่ใช่เดลิเวอรี่");
    if (order.status === "cancelled") throw new Error("ออเดอร์ถูกยกเลิกแล้ว");
    if (!canReassign(order.deliveryStatus)) {
      throw new Error("ไรเดอร์รับของไปแล้ว เปลี่ยนคนส่งไม่ได้");
    }
    const rider = await this.riders.findById(shopId, riderId);
    if (!rider || !rider.active) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
    const fee = Math.max(0, order.totalSatang - order.subtotalSatang);
    const commission = computeRiderCommission(rider.commissionType, rider.commissionValue, fee);
    return this.orders.assignRider(shopId, orderId, rider.id, commission);
  }
}

/** Resolve the rider behind a personal-link token (active riders only). */
export async function resolveRider(
  riders: IRiderRepository,
  token: string,
): Promise<Rider | null> {
  if (!isRiderTokenShape(token)) return null;
  return riders.findActiveByTokenHash(hashRiderToken(token));
}

/** 00:00 today in Bangkok (UTC+7) as a UTC ISO string. */
export function startOfBangkokDayISO(now: Date): string {
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  return new Date(
    Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate(), -7),
  ).toISOString();
}

export interface RiderDashboard {
  rider: Rider;
  jobs: OrderWithItems[];
  today: { trips: number; commissionSatang: number; codCollectedSatang: number };
}

export class GetRiderDashboardUseCase {
  constructor(
    private readonly riders: IRiderRepository,
    private readonly orders: IOrderRepository,
  ) {}
  async execute(token: string, now = new Date()): Promise<RiderDashboard | null> {
    const rider = await resolveRider(this.riders, token);
    if (!rider) return null;
    const [jobs, delivered] = await Promise.all([
      this.orders.listRiderActive(rider.shopId, rider.id),
      this.orders.listRiderDeliveredSince(rider.shopId, rider.id, startOfBangkokDayISO(now)),
    ]);
    return {
      rider,
      jobs,
      today: {
        trips: delivered.length,
        commissionSatang: delivered.reduce((s, o) => s + (o.riderCommissionSatang ?? 0), 0),
        codCollectedSatang: delivered.reduce((s, o) => s + (o.codCollected ? o.totalSatang : 0), 0),
      },
    };
  }
}

export type RiderJobAction = "picked_up" | "delivered" | "cod";

/** Rider-driven update via personal link. Only the rider's own job in their shop. */
export class RiderUpdateJobUseCase {
  constructor(
    private readonly riders: IRiderRepository,
    private readonly orders: IOrderRepository,
  ) {}
  async execute(token: string, orderId: string, action: RiderJobAction): Promise<OrderWithItems> {
    const rider = await resolveRider(this.riders, token);
    if (!rider) throw new Error("ลิงก์ไม่ถูกต้องหรือถูกยกเลิกแล้ว");
    const order = await this.orders.findById(rider.shopId, orderId);
    if (!order || order.riderId !== rider.id) throw new Error("ไม่พบงานนี้");
    if (order.status === "cancelled") throw new Error("ออเดอร์ถูกยกเลิกแล้ว");
    if (action === "cod") {
      if (order.paymentMethod !== "cash") throw new Error("ออเดอร์นี้ไม่ใช่เก็บเงินปลายทาง");
      if (order.codCollected) return order;
      return this.orders.markCodCollected(rider.shopId, orderId);
    }
    if (!canAdvanceDelivery(order.deliveryStatus, action)) {
      throw new Error("เปลี่ยนสถานะไม่ได้");
    }
    return this.orders.setDeliveryStatus(rider.shopId, orderId, action);
  }
}

export class RiderPayoutSummaryUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  execute(shopId: string, fromISO: string, toISO: string): Promise<RiderPayoutRow[]> {
    if (!(fromISO < toISO)) throw new Error("ช่วงวันที่ไม่ถูกต้อง");
    return this.riders.payoutSummary(shopId, fromISO, toISO);
  }
}

/** Rider toggles their own availability (ว่าง/ไม่ว่าง) via the personal link. */
export class SetRiderAvailabilityUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  async execute(token: string, available: boolean): Promise<Rider> {
    const rider = await resolveRider(this.riders, token);
    if (!rider) throw new Error("ลิงก์ไม่ถูกต้องหรือถูกยกเลิกแล้ว");
    return this.riders.setAvailable(rider.shopId, rider.id, available);
  }
}

export interface RiderWithLoad extends Rider {
  openJobs: number;
}

/** Shop's riders with their open-job counts (for the picker + riders list). */
export class ListRidersWithLoadUseCase {
  constructor(
    private readonly riders: IRiderRepository,
    private readonly orders: IOrderRepository,
  ) {}
  async execute(shopId: string): Promise<RiderWithLoad[]> {
    const [list, counts] = await Promise.all([
      this.riders.listByShop(shopId),
      this.orders.openJobCountsByRider(shopId),
    ]);
    return list.map((r) => ({ ...r, openJobs: counts[r.id] ?? 0 }));
  }
}
