import type {
  Order,
  Shop,
  SpinCampaign,
  SpinPrize,
  SpinPrizeType,
  SpinResult,
  User,
} from "@/src/domain/entities";
import {
  bangkokDayKey,
  bangkokMonthKey,
  eligiblePrizes,
  endOfBangkokMonthISO,
  inMonthlyWindow,
  isPhase1PrizeType,
  normalizeRewardCode,
  pickWeighted,
  prizeNeedsRedeem,
  rewardCodeFromBytes,
  ticketsForOrder,
} from "@/src/domain/services/lucky-wheel";
import { isSpendPointsOn } from "@/src/domain/services/loyalty-gates";
import type {
  ILuckyWheelRepository,
  SpinPrizeInput,
  UpdateSpinCampaignInput,
} from "@/src/application/repositories/ILuckyWheelRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IPlatformSettingsRepository } from "@/src/application/repositories/IPlatformSettingsRepository";
import type { ILoyaltyPointsBalanceRepository } from "@/src/application/repositories/ILoyaltyPointsBalanceRepository";
import type { ILoyaltyPointsTransactionRepository } from "@/src/application/repositories/ILoyaltyPointsTransactionRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";

export interface LuckyWheelDeps {
  wheel: ILuckyWheelRepository;
  shops: IShopRepository;
  platform: IPlatformSettingsRepository;
  balances: ILoyaltyPointsBalanceRepository;
  pointsTx: ILoyaltyPointsTransactionRepository;
  orders: IOrderRepository;
  /** Uniform integer in [0, max) from a CSPRNG (injectable for tests). */
  randomInt?: (max: number) => number;
  randomBytes?: (n: number) => Uint8Array;
  now?: () => Date;
}

/** Uniform integer in [0, max) using WebCrypto with rejection sampling (no modulo bias). */
export function cryptoRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) return 0;
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

function cryptoBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

const THANKS_NAME = "ขอบคุณที่ร่วมสนุก";

export interface WheelGate {
  enabled: boolean;
  campaign: SpinCampaign | null;
  shop: Shop | null;
}

export interface SpinOutcome {
  result: SpinResult;
  /** Prize that won (null = synthetic "thanks" when nothing was drawable). */
  prize: SpinPrize | null;
  ticketsLeft: number;
}

/**
 * Lucky wheel (phase 1). Every grant is idempotent on `sourceKey`; a ticket is
 * consumed with a conditional update (available → used) so one ticket = one
 * spin even under double-taps; stock is taken with a conditional decrement.
 */
export class LuckyWheelService {
  private readonly randomInt: (max: number) => number;
  private readonly randomBytes: (n: number) => Uint8Array;
  private readonly now: () => Date;

  constructor(private readonly d: LuckyWheelDeps) {
    this.randomInt = d.randomInt ?? cryptoRandomInt;
    this.randomBytes = d.randomBytes ?? cryptoBytes;
    this.now = d.now ?? (() => new Date());
  }

  /** Platform switch AND the shop's campaign switch. */
  async gate(shopId: string): Promise<WheelGate> {
    const [settings, campaign, shop] = await Promise.all([
      this.d.platform.get(),
      this.d.wheel.getCampaign(shopId),
      this.d.shops.findById(shopId),
    ]);
    return {
      enabled: !!settings.luckyWheelEnabled && !!campaign?.isActive && !!shop,
      campaign,
      shop,
    };
  }

  /** Cheap on/off check for navigation (no shop lookup — caller already has it). */
  async isOn(shopId: string): Promise<boolean> {
    const [settings, campaign] = await Promise.all([this.d.platform.get(), this.d.wheel.getCampaign(shopId)]);
    return !!settings.luckyWheelEnabled && !!campaign?.isActive;
  }

  // ── Owner settings ────────────────────────────────────────────────────────
  async updateCampaign(shopId: string, input: UpdateSpinCampaignInput): Promise<SpinCampaign> {
    const clean: UpdateSpinCampaignInput = {};
    if (input.name !== undefined) {
      const n = input.name.trim().slice(0, 80);
      if (!n) throw new Error("กรุณาตั้งชื่อแคมเปญ");
      clean.name = n;
    }
    if (input.isActive !== undefined) clean.isActive = input.isActive;
    if (input.minOrderSatang !== undefined) clean.minOrderSatang = clampInt(input.minOrderSatang, 0, 10_000_000, "ยอดขั้นต่ำ");
    if (input.ticketsPerOrder !== undefined) clean.ticketsPerOrder = clampInt(input.ticketsPerOrder, 1, 10, "สิทธิ์ต่อออเดอร์");
    if (input.monthlyFreeEnabled !== undefined) clean.monthlyFreeEnabled = input.monthlyFreeEnabled;
    if (input.monthlyWindowDays !== undefined) clean.monthlyWindowDays = clampInt(input.monthlyWindowDays, 1, 31, "จำนวนวันท้ายเดือน");
    if (input.rewardExpiryDays !== undefined) clean.rewardExpiryDays = clampInt(input.rewardExpiryDays, 1, 365, "อายุรางวัล");
    if (input.rulesText !== undefined) clean.rulesText = input.rulesText?.trim().slice(0, 2000) || null;
    if (clean.isActive) {
      const prizes = await this.d.wheel.listPrizes(shopId);
      if (!prizes.some((p) => p.isActive && isPhase1PrizeType(p.type))) {
        throw new Error("เพิ่มรางวัลอย่างน้อย 1 รายการก่อนเปิดวงล้อ");
      }
    }
    return this.d.wheel.upsertCampaign(shopId, clean);
  }

  async savePrize(shopId: string, id: string | null, raw: SpinPrizeInput): Promise<SpinPrize> {
    const input = await this.validatePrize(shopId, raw);
    if (id) {
      const existing = await this.d.wheel.findPrize(shopId, id);
      if (!existing) throw new Error("ไม่พบรางวัล");
      return this.d.wheel.updatePrize(shopId, id, input);
    }
    const campaign = await this.d.wheel.upsertCampaign(shopId, {});
    const count = (await this.d.wheel.listPrizes(shopId)).length;
    if (count >= 12) throw new Error("วงล้อมีได้สูงสุด 12 รางวัล");
    return this.d.wheel.createPrize(shopId, campaign.id, input);
  }

  private async validatePrize(shopId: string, raw: SpinPrizeInput): Promise<SpinPrizeInput> {
    if (!isPhase1PrizeType(raw.type)) throw new Error("ประเภทรางวัลนี้ยังไม่เปิดให้ใช้ (คูปองจะมาในเฟส 2)");
    const name = raw.name.trim().slice(0, 60);
    if (!name) throw new Error("กรุณาตั้งชื่อรางวัล");
    const out: SpinPrizeInput = {
      type: raw.type,
      name,
      weight: clampInt(raw.weight, 1, 100_000, "น้ำหนักโอกาส"),
      stock: raw.stock === null ? null : clampInt(raw.stock, 0, 1_000_000, "จำนวนคงเหลือ"),
      dailyCap: raw.dailyCap === null ? null : clampInt(raw.dailyCap, 1, 100_000, "จำกัดต่อวัน"),
      pointsAmount: null,
      menuItemId: null,
      costSatang: clampInt(raw.costSatang, 0, 100_000_000, "ต้นทุน"),
      isActive: raw.isActive,
      sortOrder: clampInt(raw.sortOrder, 0, 1000, "ลำดับ"),
    };
    if (raw.type === "points") {
      out.pointsAmount = clampInt(raw.pointsAmount ?? 0, 1, 100_000, "จำนวนแต้ม");
      const shop = await this.d.shops.findById(shopId);
      if (!shop || !isSpendPointsOn(shop)) {
        throw new Error("รางวัลแต้มใช้ได้เมื่อร้านเปิดระบบสะสมแต้มก่อน");
      }
    }
    if (raw.type === "free_item") {
      if (!raw.menuItemId) throw new Error("เลือกเมนูที่จะแจกฟรี");
      out.menuItemId = raw.menuItemId;
    }
    return out;
  }

  // ── Tickets ───────────────────────────────────────────────────────────────
  /** Order paid/completed → grant tickets to its member (idempotent). */
  async grantForOrder(order: Order): Promise<number> {
    if (!order.customerId || order.status === "cancelled") return 0;
    if (order.paymentStatus !== "paid" && order.status !== "completed") return 0;
    const g = await this.gate(order.shopId);
    if (!g.enabled || !g.campaign) return 0;
    const n = ticketsForOrder(order, g.campaign);
    let granted = 0;
    for (let i = 1; i <= n; i++) {
      const t = await this.d.wheel.grantTicket({
        shopId: order.shopId,
        customerId: order.customerId,
        source: "order",
        sourceKey: `order:${order.id}:${i}`,
        orderId: order.id,
      });
      if (t) granted++;
    }
    return granted;
  }

  /** Order cancelled → revoke its unused tickets. */
  async revokeForOrder(order: Pick<Order, "id" | "shopId">): Promise<number> {
    return this.d.wheel.revokeOrderTickets(order.shopId, order.id);
  }

  /**
   * Kiosk receipt QR: a member claims the tickets of an anonymous kiosk order.
   * The order must be paid/completed, not cancelled, have no customer of its
   * own (else tickets were granted automatically) and not be claimed already.
   */
  async claimKioskOrder(shopId: string, orderId: string, customerId: string): Promise<number> {
    const g = await this.gate(shopId);
    if (!g.enabled || !g.campaign) throw new Error("ร้านนี้ยังไม่เปิดวงล้อ");
    const order = await this.d.orders.findById(shopId, orderId);
    if (!order) throw new Error("ไม่พบออเดอร์");
    if (order.status === "cancelled") throw new Error("ออเดอร์นี้ถูกยกเลิกแล้ว");
    if (order.paymentStatus !== "paid" && order.status !== "completed") {
      throw new Error("ร้านยังไม่ยืนยันการชำระเงินของออเดอร์นี้ ลองสแกนอีกครั้งหลังชำระเงิน");
    }
    if (order.customerId && order.customerId !== customerId) throw new Error("ออเดอร์นี้มีเจ้าของสิทธิ์แล้ว");
    const n = ticketsForOrder(order, g.campaign);
    if (n === 0) throw new Error("ยอดออเดอร์นี้ยังไม่ถึงขั้นต่ำที่ได้สิทธิ์หมุน");
    const existing = await this.d.wheel.ticketsByOrder(shopId, orderId);
    if (existing.some((t) => t.customerId !== customerId)) throw new Error("ใบเสร็จนี้ถูกใช้รับสิทธิ์ไปแล้ว");
    let granted = 0;
    for (let i = 1; i <= n; i++) {
      const t = await this.d.wheel.grantTicket({
        shopId,
        customerId,
        source: "kiosk_claim",
        sourceKey: `order:${orderId}:${i}`,
        orderId,
      });
      if (t) granted++;
    }
    if (granted === 0 && existing.length > 0) throw new Error("รับสิทธิ์จากใบเสร็จนี้ไปแล้ว");
    return granted;
  }

  /** Lazy monthly free spin: granted on visit inside the window (idempotent per month). */
  async ensureMonthlyTicket(shopId: string, customerId: string): Promise<boolean> {
    const g = await this.gate(shopId);
    const c = g.campaign;
    if (!g.enabled || !c?.monthlyFreeEnabled) return false;
    const now = this.now();
    if (!inMonthlyWindow(now, c.monthlyWindowDays)) return false;
    const t = await this.d.wheel.grantTicket({
      shopId,
      customerId,
      source: "monthly",
      sourceKey: `monthly:${bangkokMonthKey(now)}:${customerId}`,
      expiresAt: endOfBangkokMonthISO(now),
    });
    return t !== null;
  }

  async ticketCount(shopId: string, customerId: string): Promise<number> {
    return (await this.d.wheel.availableTickets(shopId, customerId, this.now().toISOString())).length;
  }

  /** Prizes currently drawable (for the wheel + transparent odds). */
  async drawablePrizes(shopId: string, shop?: Shop | null): Promise<SpinPrize[]> {
    const s = shop ?? (await this.d.shops.findById(shopId));
    const [prizes, wins] = await Promise.all([
      this.d.wheel.listPrizes(shopId),
      this.d.wheel.winsOnDay(shopId, bangkokDayKey(this.now())),
    ]);
    return eligiblePrizes(prizes, { winsToday: wins, pointsOn: !!s && isSpendPointsOn(s) });
  }

  // ── Spin ──────────────────────────────────────────────────────────────────
  async spin(shopId: string, customerId: string): Promise<SpinOutcome> {
    const g = await this.gate(shopId);
    if (!g.enabled || !g.campaign || !g.shop) throw new Error("ร้านนี้ยังไม่เปิดวงล้อ");
    const now = this.now();
    const nowISO = now.toISOString();

    // 1) Consume exactly one ticket (conditional update guards double taps).
    const tickets = await this.d.wheel.availableTickets(shopId, customerId, nowISO);
    let ticketId: string | null = null;
    for (const t of tickets.slice(0, 5)) {
      if (await this.d.wheel.useTicket(t.id, nowISO)) {
        ticketId = t.id;
        break;
      }
    }
    if (!ticketId) throw new Error("ยังไม่มีสิทธิ์หมุน");

    // 2) Draw among eligible prizes; a prize that loses the stock race is excluded and we redraw.
    let pool = await this.drawablePrizes(shopId, g.shop);
    let prize: SpinPrize | null = null;
    while (pool.length > 0) {
      const total = pool.reduce((a, p) => a + p.weight, 0);
      const pick = pickWeighted(pool, this.randomInt(total));
      if (!pick) break;
      if (await this.d.wheel.takeStock(pick.id)) {
        prize = pick;
        break;
      }
      pool = pool.filter((p) => p.id !== pick.id);
    }

    // 3) Apply the prize.
    const type: SpinPrizeType = prize?.type ?? "thanks";
    let pointsAwarded = 0;
    if (prize && type === "points" && prize.pointsAmount) {
      pointsAwarded = prize.pointsAmount;
      const bal = await this.d.balances.findOrCreate(shopId, customerId);
      await this.d.balances.addPoints(bal.id, pointsAwarded);
      await this.d.pointsTx.create({
        shopId,
        customerId,
        type: "earn",
        quantity: pointsAwarded,
        performedBy: null,
        note: `รางวัลหมุนวงล้อ: ${prize.name}`,
      });
    }
    const needsRedeem = prizeNeedsRedeem(type);
    const result = await this.d.wheel.createResult({
      shopId,
      customerId,
      ticketId,
      prizeId: prize?.id ?? null,
      prizeType: type,
      prizeName: prize?.name ?? THANKS_NAME,
      pointsAwarded,
      costSatang: prize?.costSatang ?? 0,
      dayKey: bangkokDayKey(now),
      rewardCode: needsRedeem ? rewardCodeFromBytes(this.randomBytes(8)) : null,
      rewardStatus: needsRedeem ? "pending" : "none",
      expiresAt: needsRedeem
        ? new Date(now.getTime() + g.campaign.rewardExpiryDays * 86_400_000).toISOString()
        : null,
    });
    return { result, prize, ticketsLeft: Math.max(0, tickets.length - 1) };
  }

  // ── Redeem (staff/owner) ──────────────────────────────────────────────────
  async findRewardByCode(shopId: string, codeInput: string): Promise<SpinResult | null> {
    const code = normalizeRewardCode(codeInput);
    if (code.length < 6) return null;
    return this.d.wheel.findResultByCode(shopId, code);
  }

  async redeem(shopId: string, resultId: string, actor: User, branchId: string | null): Promise<SpinResult> {
    const r = await this.d.wheel.findResult(shopId, resultId);
    if (!r || r.rewardStatus === "none") throw new Error("ไม่พบรางวัลที่ต้องแลก");
    if (r.rewardStatus === "redeemed") throw new Error("รางวัลนี้ถูกแลกไปแล้ว");
    if (r.expiresAt && r.expiresAt <= this.now().toISOString()) throw new Error("รางวัลนี้หมดอายุแล้ว");
    const ok = await this.d.wheel.markRedeemed(shopId, r.id, actor.id, branchId, this.now().toISOString());
    if (!ok) throw new Error("รางวัลนี้ถูกแลกไปแล้ว");
    return (await this.d.wheel.findResult(shopId, r.id))!;
  }
}

function clampInt(v: number, min: number, max: number, label: string): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label}ต้องอยู่ระหว่าง ${min}–${max}`);
  return n;
}
