import { nanoid } from "nanoid";

import type {
  OrderWithItems,
  Rider,
  RiderAccount,
  RiderPayoutRow,
  RiderShopMembership,
} from "@/src/domain/entities";
import type { IOrderRepository, RiderJobScope } from "@/src/application/repositories/IOrderRepository";
import type {
  IRiderRepository,
  RiderInput,
} from "@/src/application/repositories/IRiderRepository";
import {
  assertValidCommission,
  canReassign,
  computeRiderCommission,
  generateRiderToken,
  hashRiderToken,
  isRiderTokenShape,
  needsCodCollection,
  normalizeLineId,
  riderActionBlockReason,
  riderCashDue,
  type RiderJobAction,
} from "@/src/domain/services/rider";
import { validateRiderAvatar } from "@/src/domain/services/rider-avatar";
import type { RiderSessionPayload } from "@/src/domain/services/rider-session-token";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";

export type { RiderJobAction } from "@/src/domain/services/rider";

/** Thai phone → canonical digits (leading +66 → 0). */
export function normalizeRiderPhone(input: string): string {
  let p = String(input ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  if (p.startsWith("+66")) p = `0${p.slice(3)}`;
  return p.replace(/\+/g, "");
}

function cleanInput(input: RiderInput): RiderInput {
  const name = input.name.trim().slice(0, 80);
  const phone = normalizeRiderPhone(input.phone);
  if (name.length < 1) throw new Error("กรุณาใส่ชื่อไรเดอร์");
  if (phone.length < 9) throw new Error("เบอร์โทรไม่ถูกต้อง");
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

/** Thrown when the same phone already exists in this shop (caller may confirm and retry). */
export class DuplicateRiderPhoneError extends Error {
  readonly code = "DUPLICATE_PHONE";
  constructor(public readonly existingName: string) {
    super(`มีไรเดอร์เบอร์นี้ในร้านอยู่แล้ว (${existingName}) — กดยืนยันอีกครั้งถ้าต้องการเพิ่มซ้ำ`);
  }
}

// ---------------------------------------------------------------- shop side

/**
 * Shop adds a rider by phone. Every new membership starts `invited`: the rider
 * confirms by opening the shop's personal link. If a rider account already
 * owns this phone, the membership attaches to it (an invitation the rider must
 * accept on their own device). The shop never learns about other shops.
 */
export class CreateRiderUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  async execute(
    shopId: string,
    input: RiderInput,
    opts: { allowDuplicatePhone?: boolean } = {},
  ): Promise<Rider> {
    const data = cleanInput(input);
    let account = await this.riders.findAccountByPhoneKey(data.phone);
    if (account && (await this.riders.findByShopAndAccount(shopId, account.id))) {
      throw new Error("เบอร์นี้เป็นไรเดอร์ของร้านอยู่แล้ว");
    }
    const dupes = await this.riders.findByShopAndPhone(shopId, data.phone);
    if (dupes.length > 0 && !opts.allowDuplicatePhone) {
      throw new DuplicateRiderPhoneError(dupes[0].name);
    }
    if (!account) {
      try {
        account = await this.riders.createAccount({ name: data.name, phone: data.phone, phoneKey: data.phone });
      } catch {
        // Lost a race on the unique phone key → use the winner.
        account = await this.riders.findAccountByPhoneKey(data.phone);
        if (!account) throw new Error("สร้างบัญชีไรเดอร์ไม่สำเร็จ");
        if (await this.riders.findByShopAndAccount(shopId, account.id)) {
          throw new Error("เบอร์นี้เป็นไรเดอร์ของร้านอยู่แล้ว");
        }
      }
    }
    return this.riders.create(shopId, { ...data, accountId: account.id, status: "invited" });
  }
}

/** Edits THIS shop's membership only (name/phone here are the shop's own labels). */
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

/** Shop ends ITS OWN membership (deactivate + kill the link). Other shops are untouched. */
export class RevokeRiderMembershipUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  async execute(shopId: string, riderId: string): Promise<Rider> {
    const existing = await this.riders.findById(shopId, riderId);
    if (!existing) throw new Error("ไม่พบไรเดอร์ในร้านนี้");
    await this.riders.setTokenHash(shopId, riderId, null);
    return this.riders.update(shopId, riderId, { active: false });
  }
}

/** Owner assigns/reassigns one of THEIR OWN active, approved riders to a delivery order. */
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
    if (rider.status !== "approved") throw new Error("ไรเดอร์ยังไม่ได้ยืนยันคำเชิญของร้าน");
    const fee = Math.max(0, order.totalSatang - order.subtotalSatang);
    const commission = computeRiderCommission(rider.commissionType, rider.commissionValue, fee);
    return this.orders.assignRider(shopId, orderId, rider.id, commission);
  }
}

export class RiderPayoutSummaryUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  execute(shopId: string, fromISO: string, toISO: string): Promise<RiderPayoutRow[]> {
    if (!(fromISO < toISO)) throw new Error("ช่วงวันที่ไม่ถูกต้อง");
    return this.riders.payoutSummary(shopId, fromISO, toISO);
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

/** One page of the shop's riders with open-job counts (back-office list). */
export class ListRidersPageUseCase {
  constructor(
    private readonly riders: IRiderRepository,
    private readonly orders: IOrderRepository,
  ) {}
  async execute(
    shopId: string,
    page: number,
    pageSize = 10,
  ): Promise<{ items: RiderWithLoad[]; total: number; page: number; pageCount: number }> {
    const size = Math.min(50, Math.max(1, Math.floor(pageSize)));
    const first = await this.riders.listByShopPaged(shopId, 0, 0);
    const pageCount = Math.max(1, Math.ceil(first.total / size));
    const p = Math.min(pageCount, Math.max(1, Math.floor(page) || 1));
    const [{ items, total }, counts] = await Promise.all([
      this.riders.listByShopPaged(shopId, (p - 1) * size, size),
      this.orders.openJobCountsByRider(shopId),
    ]);
    return {
      items: items.map((r) => ({ ...r, openJobs: counts[r.id] ?? 0 })),
      total,
      page: p,
      pageCount: Math.max(1, Math.ceil(total / size)),
    };
  }
}

export interface ShopRiderDetail {
  rider: RiderWithLoad;
  /** This shop's delivered jobs for this rider (last 30 days, newest first). */
  recent: OrderWithItems[];
  last30: { trips: number; commissionSatang: number; cashDueSatang: number };
}

/** Back-office detail of ONE membership — this shop's data only. */
export class GetShopRiderDetailUseCase {
  constructor(
    private readonly riders: IRiderRepository,
    private readonly orders: IOrderRepository,
  ) {}
  async execute(shopId: string, riderId: string, now = new Date()): Promise<ShopRiderDetail | null> {
    const rider = await this.riders.findById(shopId, riderId);
    if (!rider) return null;
    const since = new Date(now.getTime() - 30 * 86400_000).toISOString();
    const [recent, counts] = await Promise.all([
      this.orders.listRiderDeliveredSince([{ shopId, riderId }], since),
      this.orders.openJobCountsByRider(shopId),
    ]);
    return {
      rider: { ...rider, openJobs: counts[rider.id] ?? 0 },
      recent: recent.slice(0, 50),
      last30: summariseCash(recent),
    };
  }
}

// --------------------------------------------------------------- rider side

/** Resolve the ACTIVE membership behind a shop's personal-link token. */
export async function resolveRider(
  riders: IRiderRepository,
  token: string,
): Promise<Rider | null> {
  if (!isRiderTokenShape(token)) return null;
  return riders.findActiveByTokenHash(hashRiderToken(token));
}

/** What a signed-in rider device can see: its account + proven, approved, active shops. */
export interface RiderSession {
  account: RiderAccount;
  payload: RiderSessionPayload;
  /** Approved + active memberships of this account that this device proved (by link). */
  memberships: RiderShopMembership[];
  /** True when the device proved every approved shop of the account (may change global profile). */
  full: boolean;
}

/** Validate a session payload against the DB (epoch, account, membership ownership). */
export async function resolveRiderSession(
  riders: IRiderRepository,
  payload: RiderSessionPayload,
): Promise<RiderSession | null> {
  const account = await riders.findAccountById(payload.accountId);
  if (!account || account.mergedIntoId || account.sessionEpoch !== payload.epoch) return null;
  const all = await riders.listMembershipsByAccount(account.id);
  const usable = all.filter((m) => m.rider.active && m.rider.status === "approved");
  const scope = new Set(payload.scope);
  const memberships = usable.filter((m) => scope.has(m.rider.id));
  if (memberships.length === 0) return null;
  return {
    account,
    payload,
    memberships,
    full: usable.every((m) => scope.has(m.rider.id)),
  };
}

function withScope(p: RiderSessionPayload, accountId: string, epoch: number, add: string): RiderSessionPayload {
  const base = p.accountId === accountId ? p.scope : [];
  return { accountId, epoch, scope: [...base.filter((s) => s !== add), add] };
}

/** What opening a shop link (/r/<token>) should do. */
export type RiderLinkDecision =
  | { kind: "invalid" }
  | { kind: "login"; payload: RiderSessionPayload }
  | { kind: "confirm" };

export interface RiderInviteView {
  rider: Rider;
  shopName: string;
  /** Signed-in account on this device, if any. */
  current: { name: string; phone: string; sameAccount: boolean } | null;
  /**
   * Allowed choices:
   * - accept: confirm this shop (same account, or a fresh/one-shop account)
   * - attach: add this shop to the signed-in account (different account)
   * - new_account: start a separate account for this shop only (invite to an
   *   existing multi-shop account opened on a device that is not signed in to it)
   * - switch: sign in as this link's account instead (approved memberships only)
   */
  choices: Array<"accept" | "attach" | "new_account" | "switch">;
}

/**
 * Personal shop links = login for that shop + invitation. A device NEVER gains
 * another shop's data just by holding one shop's link (session scope).
 */
export class RiderLinkUseCases {
  constructor(
    private readonly riders: IRiderRepository,
    private readonly shopName: (shopId: string) => Promise<string>,
  ) {}

  private async otherApproved(m: Rider): Promise<boolean> {
    const all = await this.riders.listMembershipsByAccount(m.accountId);
    return all.some((x) => x.rider.id !== m.id && x.rider.status === "approved" && x.rider.active);
  }

  async open(token: string, current: RiderSession | null): Promise<RiderLinkDecision> {
    const m = await resolveRider(this.riders, token);
    if (!m || !m.accountId) return { kind: "invalid" };
    const acct = await this.riders.findAccountById(m.accountId);
    if (!acct) return { kind: "invalid" };
    if (current && current.account.id === m.accountId) {
      if (m.status === "approved") {
        return { kind: "login", payload: withScope(current.payload, acct.id, acct.sessionEpoch, m.id) };
      }
      return { kind: "confirm" };
    }
    if (current) return { kind: "confirm" };
    if (m.status === "approved") {
      return { kind: "login", payload: { accountId: acct.id, epoch: acct.sessionEpoch, scope: [m.id] } };
    }
    return { kind: "confirm" };
  }

  async view(token: string, current: RiderSession | null): Promise<RiderInviteView | null> {
    const m = await resolveRider(this.riders, token);
    if (!m || !m.accountId) return null;
    const shopName = await this.shopName(m.shopId);
    const same = !!current && current.account.id === m.accountId;
    const choices: RiderInviteView["choices"] = [];
    if (current && !same) {
      choices.push("attach");
      choices.push(m.status === "approved" ? "switch" : "new_account");
    } else if (same || m.status === "approved" || !(await this.otherApproved(m))) {
      choices.push("accept");
    } else {
      choices.push("new_account");
    }
    return {
      rider: m,
      shopName,
      current: current
        ? { name: current.account.name, phone: current.account.phone, sameAccount: same }
        : null,
      choices,
    };
  }

  /** Apply the rider's choice on the confirm page. Returns the new session payload. */
  async decide(
    token: string,
    current: RiderSession | null,
    choice: "accept" | "attach" | "new_account" | "switch",
  ): Promise<RiderSessionPayload> {
    const v = await this.view(token, current);
    if (!v) throw new Error("ลิงก์ไม่ถูกต้องหรือถูกยกเลิกแล้ว");
    if (!v.choices.includes(choice)) throw new Error("ทำรายการนี้ไม่ได้");
    const m = v.rider;
    if (choice === "accept" || choice === "switch") {
      if (m.status !== "approved") await this.riders.approveMembership(m.id);
      const acct = await this.riders.findAccountById(m.accountId);
      if (!acct) throw new Error("ไม่พบบัญชีไรเดอร์");
      return current && current.account.id === acct.id
        ? withScope(current.payload, acct.id, acct.sessionEpoch, m.id)
        : { accountId: acct.id, epoch: acct.sessionEpoch, scope: [m.id] };
    }
    if (choice === "attach") {
      if (!current) throw new Error("ทำรายการนี้ไม่ได้");
      const target = current.account;
      const clash = await this.riders.findByShopAndAccount(m.shopId, target.id);
      if (clash && clash.id !== m.id) {
        throw new Error("บัญชีของคุณเป็นไรเดอร์ของร้านนี้อยู่แล้ว");
      }
      const fromId = m.accountId;
      await this.riders.moveMembership(m.id, target.id);
      const left = await this.riders.listMembershipsByAccount(fromId);
      if (left.length === 0) await this.riders.markAccountMerged(fromId, target.id);
      return withScope(current.payload, target.id, target.sessionEpoch, m.id);
    }
    // new_account: a separate identity for this shop only (no access to anything else).
    const fresh = await this.riders.createAccount({ name: m.name, phone: m.phone, phoneKey: null });
    await this.riders.moveMembership(m.id, fresh.id);
    return { accountId: fresh.id, epoch: fresh.sessionEpoch, scope: [m.id] };
  }
}

/** 00:00 today in Bangkok (UTC+7) as a UTC ISO string. */
export function startOfBangkokDayISO(now: Date): string {
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  return new Date(
    Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate(), -7),
  ).toISOString();
}

/** Monday 00:00 of the current week in Bangkok (UTC+7) as a UTC ISO string. */
export function startOfBangkokWeekISO(now: Date): string {
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  const back = (bkk.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return new Date(
    Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate() - back, -7),
  ).toISOString();
}

function scopes(s: RiderSession): RiderJobScope[] {
  return s.memberships.map((m) => ({ shopId: m.shopId, riderId: m.rider.id }));
}

export interface RiderJob {
  order: OrderWithItems;
  shopId: string;
  shopName: string;
  /** Why the rider cannot press the next step yet (Thai), or null. */
  blockedReason: string | null;
}

export interface RiderDashboard {
  jobs: RiderJob[];
  /** All shops of this device (for the filter), with open-job counts. */
  shops: Array<{ shopId: string; shopName: string; openJobs: number }>;
  today: { trips: number; commissionSatang: number; codCollectedSatang: number };
}

export class GetRiderDashboardUseCase {
  constructor(private readonly orders: IOrderRepository) {}
  async execute(session: RiderSession, shopFilter?: string | null, now = new Date()): Promise<RiderDashboard> {
    const all = scopes(session);
    const [jobs, delivered] = await Promise.all([
      this.orders.listRiderActive(all),
      this.orders.listRiderDeliveredSince(all, startOfBangkokDayISO(now)),
    ]);
    const nameOf = new Map(session.memberships.map((m) => [m.shopId, m.shopName]));
    const shown = shopFilter && nameOf.has(shopFilter) ? jobs.filter((o) => o.shopId === shopFilter) : jobs;
    return {
      jobs: shown.map((o) => ({
        order: o,
        shopId: o.shopId,
        shopName: nameOf.get(o.shopId) ?? "",
        blockedReason:
          o.deliveryStatus === "assigned"
            ? riderActionBlockReason(o, "picked_up")
            : riderActionBlockReason(o, needsCodCollection(o) ? "cod_delivered" : "delivered"),
      })),
      shops: session.memberships.map((m) => ({
        shopId: m.shopId,
        shopName: m.shopName,
        openJobs: jobs.filter((o) => o.shopId === m.shopId).length,
      })),
      today: summarise(delivered),
    };
  }
}

/** Rider-driven job update. Only a job of an approved membership proven on this device. */
export class RiderUpdateJobUseCase {
  constructor(private readonly orders: IOrderRepository) {}
  async execute(
    session: RiderSession,
    shopId: string,
    orderId: string,
    action: RiderJobAction,
  ): Promise<OrderWithItems> {
    const m = session.memberships.find((x) => x.shopId === shopId);
    if (!m) throw new Error("ไม่พบงานนี้");
    const order = await this.orders.findById(shopId, orderId);
    if (!order || order.riderId !== m.rider.id) throw new Error("ไม่พบงานนี้");
    const reason = riderActionBlockReason(order, action);
    if (reason) throw new Error(reason);
    if (action === "cod" || action === "cod_delivered") {
      let o = order.codCollected ? order : await this.orders.markCodCollected(shopId, orderId);
      if (action === "cod_delivered") o = await this.orders.setDeliveryStatus(shopId, orderId, "delivered");
      return this.settle(shopId, o);
    }
    const updated = await this.orders.setDeliveryStatus(shopId, orderId, action);
    return this.settle(shopId, updated);
  }

  /** Delivered → completed; COD collected → paid. */
  private async settle(shopId: string, order: OrderWithItems): Promise<OrderWithItems> {
    const step = settleAfterRiderUpdate(order);
    let out = order;
    if (step.complete) out = await this.orders.setStatus(shopId, order.id, "completed");
    if (step.markPaid) out = await this.orders.markPaid(shopId, order.id);
    return out;
  }
}

/** What the order status/payment should become after a rider update (pure). */
export function settleAfterRiderUpdate(o: {
  status: OrderWithItems["status"];
  paymentStatus: OrderWithItems["paymentStatus"];
  paymentMethod: OrderWithItems["paymentMethod"];
  deliveryStatus: OrderWithItems["deliveryStatus"];
  codCollected: boolean;
}): { complete: boolean; markPaid: boolean } {
  return {
    complete:
      o.deliveryStatus === "delivered" &&
      o.status !== "completed" &&
      o.status !== "cancelled",
    markPaid:
      o.paymentMethod === "cash" &&
      o.codCollected &&
      o.paymentStatus !== "paid" &&
      o.status !== "cancelled",
  };
}

/**
 * ว่าง/ไม่ว่าง. Global mode: one switch for the whole account (only a device
 * that proved every shop may flip it account-wide; otherwise only its shops).
 * Per-shop mode: one membership at a time.
 */
export class SetRiderAvailabilityUseCase {
  constructor(private readonly riders: IRiderRepository) {}
  async execute(
    session: RiderSession,
    available: boolean,
    mode: "global" | "per_shop",
    shopId?: string | null,
  ): Promise<void> {
    if (mode === "per_shop" && shopId) {
      const m = session.memberships.find((x) => x.shopId === shopId);
      if (!m) throw new Error("ไม่พบร้านนี้");
      await this.riders.setAvailable(m.shopId, m.rider.id, available);
      return;
    }
    if (session.full) {
      await this.riders.setAccountAvailable(session.account.id, available);
      return;
    }
    for (const m of session.memberships) await this.riders.setAvailable(m.shopId, m.rider.id, available);
  }
}

export interface RiderEarningsPeriod {
  trips: number;
  commissionSatang: number;
  /** Cash the rider holds for the shop (collected COD + unpaid cash delivered). */
  codCollectedSatang: number;
}

export interface RiderEarnings {
  today: RiderEarningsPeriod;
  week: RiderEarningsPeriod;
  perShop: Array<{ shopId: string; shopName: string; today: RiderEarningsPeriod; week: RiderEarningsPeriod }>;
  /** Most recent delivered jobs (≤30) with their shop. */
  history: Array<{ order: OrderWithItems; shopName: string; cashDue: boolean }>;
}

function summarise(list: OrderWithItems[]): RiderEarningsPeriod {
  return {
    trips: list.length,
    commissionSatang: list.reduce((s, o) => s + (o.riderCommissionSatang ?? 0), 0),
    codCollectedSatang: list.reduce((s, o) => s + (riderCashDue(o) ? o.totalSatang : 0), 0),
  };
}

function summariseCash(list: OrderWithItems[]) {
  const s = summarise(list);
  return { trips: s.trips, commissionSatang: s.commissionSatang, cashDueSatang: s.codCollectedSatang };
}

/** Rider's own earnings across their shops: totals + per-shop split + history. */
export class GetRiderEarningsUseCase {
  constructor(private readonly orders: IOrderRepository) {}
  async execute(session: RiderSession, now = new Date()): Promise<RiderEarnings> {
    const week = startOfBangkokWeekISO(now);
    const day = startOfBangkokDayISO(now);
    const since = week < day ? week : day; // week start is always ≤ today
    const recent = await this.orders.listRiderDeliveredSince(scopes(session), "1970-01-01T00:00:00.000Z");
    const inWeek = recent.filter((o) => (o.deliveredAt ?? "") >= since);
    const nameOf = new Map(session.memberships.map((m) => [m.shopId, m.shopName]));
    return {
      today: summarise(inWeek.filter((o) => (o.deliveredAt ?? "") >= day)),
      week: summarise(inWeek.filter((o) => (o.deliveredAt ?? "") >= week)),
      perShop: session.memberships.map((m) => {
        const mine = inWeek.filter((o) => o.shopId === m.shopId);
        return {
          shopId: m.shopId,
          shopName: m.shopName,
          today: summarise(mine.filter((o) => (o.deliveredAt ?? "") >= day)),
          week: summarise(mine.filter((o) => (o.deliveredAt ?? "") >= week)),
        };
      }),
      history: recent.slice(0, 30).map((o) => ({
        order: o,
        shopName: nameOf.get(o.shopId) ?? "",
        cashDue: riderCashDue(o),
      })),
    };
  }
}

/** Rider uploads/replaces their own (account-wide) profile photo. */
export class SaveRiderAvatarUseCase {
  constructor(
    private readonly riders: IRiderRepository,
    private readonly storage: ISlipStorage,
  ) {}
  async execute(session: RiderSession, contentType: string, bytes: Uint8Array): Promise<string> {
    if (!session.full) {
      throw new Error("เปลี่ยนรูปได้จากเครื่องที่เปิดลิงก์ของทุกร้านแล้วเท่านั้น");
    }
    const ext = validateRiderAvatar(contentType, bytes);
    const key = `rider-accounts/${session.account.id}/${nanoid()}.${ext}`;
    await this.storage.saveObject({ key, contentType, bytes });
    const prev = await this.riders.setAccountAvatar(session.account.id, key);
    // Only delete photos this account owns; legacy per-shop keys may still be referenced.
    if (prev && prev !== key && prev.startsWith("rider-accounts/")) await this.storage.delete(prev);
    return key;
  }
}
