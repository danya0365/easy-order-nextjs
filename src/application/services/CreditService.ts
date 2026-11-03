import {
  addDaysYmd,
  creditCutoffFor,
  creditDayOf,
  creditDayWindow,
  dailyCreditFee,
  effectiveConfig,
  normalizePlatformConfig,
  normalizeShopOverride,
  orderGate,
  resolveCreditTopup,
  type CreditGate,
  type CreditPlatformConfig,
  type CreditShopOverride,
  type EffectiveCreditConfig,
} from "@/src/domain/services/credit";
import type { CreditDailySettlement, CreditTopup, ICreditRepository } from "@/src/application/repositories/ICreditRepository";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";
import { isSupportedImage } from "@/src/domain/services/image-signature";

export const PLATFORM_CONFIG_ID = "platform";

/** Thrown when the low-balance rule blocks new orders. Message is customer-safe. */
export class CreditBlockedError extends Error {
  constructor() {
    super("ร้านปิดรับออเดอร์ชั่วคราว ขออภัยในความไม่สะดวก");
    this.name = "CreditBlockedError";
  }
}

/** Hook for future slip auto-verification (e.g. a bank/slip-check API). */
export interface ICreditSlipVerifier {
  verify(input: { topupId: string; shopId: string; amountSatang: number; bytes: Uint8Array; promptpayId: string }): Promise<{
    status: "verified" | "mismatch" | "unverified" | "skipped";
    detail?: string;
  }>;
}

/** Default: no automatic check — every slip waits for an admin. */
export class ManualCreditSlipVerifier implements ICreditSlipVerifier {
  async verify() {
    return { status: "skipped" as const, detail: "manual review" };
  }
}

export interface CreditTodayProgress {
  businessDate: string;
  cutoffTime: string;
  salesSatang: number;
  orderCount: number;
  thresholdSatang: number;
  metric: "orders" | "sales";
  thresholdOrders: number;
  feeSatang: number;
  reached: boolean;
}

export interface SettleDayResult {
  settlement: CreditDailySettlement;
  /** false = the day had already been settled (idempotent no-op). */
  created: boolean;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export interface CreditStatus {
  enabled: boolean;
  balanceSatang: number;
  gate: CreditGate;
  config: EffectiveCreditConfig;
}

const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const SLIP_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic"];

export type CreditMemo = <T>(key: string, fn: () => Promise<T>) => Promise<T>;

export class CreditService {
  constructor(
    private readonly repo: ICreditRepository,
    private readonly slipStorage: ISlipStorage,
    private readonly verifier: ICreditSlipVerifier = new ManualCreditSlipVerifier(),
    /** Optional request-scoped memo (container injects requestMemo) so the platform config is read once per request. */
    private readonly memo: CreditMemo = (_k, fn) => fn(),
  ) {}

  /** Bumped on every save so a read later in the same request never sees a stale memo. */
  private configVersion = 0;

  async getPlatformConfig(): Promise<CreditPlatformConfig> {
    return this.memo(`credit:platform-config:${this.configVersion}`, async () =>
      normalizePlatformConfig((await this.repo.getConfigRaw(PLATFORM_CONFIG_ID)) ?? {}),
    );
  }

  /** Single cheap check (memoised per request): is the master switch on? */
  async isMasterEnabled(): Promise<boolean> {
    return (await this.getPlatformConfig()).enabled;
  }

  async savePlatformConfig(raw: unknown, by: string | null): Promise<CreditPlatformConfig> {
    const cfg = normalizePlatformConfig(raw);
    // First switch-on stamps the start date so the daily job never bills days
    // from before the wallet existed.
    if (cfg.enabled && !cfg.daily.startDate) cfg.daily.startDate = creditDayOf(new Date(), cfg.daily.cutoffTime);
    await this.repo.saveConfig(PLATFORM_CONFIG_ID, null, cfg, by);
    this.configVersion++;
    return cfg;
  }

  async getShopOverride(shopId: string): Promise<CreditShopOverride | null> {
    const raw = await this.repo.getConfigRaw(shopId);
    return raw ? normalizeShopOverride(raw) : null;
  }

  async saveShopOverride(shopId: string, raw: unknown | null, by: string | null): Promise<void> {
    if (raw == null) return this.repo.deleteConfig(shopId);
    await this.repo.saveConfig(shopId, shopId, normalizeShopOverride(raw), by);
  }

  async getEffective(shopId: string): Promise<EffectiveCreditConfig> {
    const [p, o] = await Promise.all([this.getPlatformConfig(), this.getShopOverride(shopId)]);
    return effectiveConfig(p, o);
  }

  /**
   * Wallet status. While the master switch is off this costs one (memoised)
   * config read and no wallet queries, unless `withBalance` is set (admin views).
   */
  async getStatus(shopId: string, opts: { withBalance?: boolean } = {}): Promise<CreditStatus> {
    const platform = await this.getPlatformConfig();
    if (!platform.enabled) {
      const balanceSatang = opts.withBalance ? await this.repo.getBalance(shopId) : 0;
      return { enabled: false, balanceSatang, gate: { allowed: true, level: "ok" }, config: effectiveConfig(platform, null) };
    }
    const [config, balanceSatang] = await Promise.all([
      this.getShopOverride(shopId).then((o) => effectiveConfig(platform, o)),
      this.repo.getBalance(shopId),
    ]);
    const gate = config.enabled ? orderGate(config.lowBalance, balanceSatang) : { allowed: true, level: "ok" as const };
    return { enabled: config.enabled, balanceSatang, gate, config };
  }

  /** Throws CreditBlockedError if the shop's low-balance rule (block mode) closes new orders. */
  async assertCanTakeOrder(shopId: string): Promise<void> {
    if (!(await this.isMasterEnabled())) return;
    const s = await this.getStatus(shopId);
    if (s.enabled && !s.gate.allowed) throw new CreditBlockedError();
  }

  /** Cutoff + effective config for a shop (null when the shop does not exist). */
  private async shopDayContext(shopId: string) {
    const [shop, config] = await Promise.all([this.repo.findShopCutoff(shopId), this.getEffective(shopId)]);
    if (!shop.exists) return null;
    return { config, cutoff: creditCutoffFor(config.daily, shop.billingCutoffTime) };
  }

  /** Admin: set / clear a shop's business-day cutoff ("HH:MM" Bangkok, null = platform default). */
  async setShopCutoff(shopId: string, cutoff: string | null): Promise<void> {
    const v = cutoff?.trim() || null;
    if (v !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Error("เวลาตัดรอบต้องเป็นรูปแบบ HH:MM");
    if (!(await this.repo.findShopCutoff(shopId)).exists) throw new Error("ไม่พบร้านค้า");
    await this.repo.setShopCutoff(shopId, v);
  }

  /** Today's (open business day) sales vs the threshold, for the shop dashboard. */
  async getTodayProgress(shopId: string, now: Date = new Date()): Promise<CreditTodayProgress | null> {
    if (!(await this.isMasterEnabled())) return null;
    const ctx = await this.shopDayContext(shopId);
    if (!ctx || !ctx.config.enabled) return null;
    const d = ctx.config.daily;
    const businessDate = creditDayOf(now, ctx.cutoff);
    const w = creditDayWindow(businessDate, ctx.cutoff);
    const s = await this.repo.sumSalesBetween(shopId, w.start.toISOString(), now.toISOString(), d.countStatuses, d.basis);
    return {
      businessDate,
      cutoffTime: ctx.cutoff,
      salesSatang: s.salesSatang,
      orderCount: s.orderCount,
      thresholdSatang: d.thresholdSatang,
      metric: d.metric,
      thresholdOrders: d.thresholdOrders,
      feeSatang: d.feeSatang,
      reached: dailyCreditFee(d, s) > 0,
    };
  }

  /**
   * Settle one CLOSED business day for one shop: sum its counted sales, and if
   * they reach the threshold deduct the daily fee. Idempotent twice over: the
   * unique (shop, date) settlement row and the ledger key daily:<shop>:<date>.
   */
  async settleDay(shopId: string, businessDate: string, opts: { by?: string; now?: Date; force?: boolean } = {}): Promise<SettleDayResult> {
    if (!YMD.test(businessDate)) throw new Error("วันที่ไม่ถูกต้อง");
    const existing = await this.repo.findSettlement(shopId, businessDate);
    if (existing) return { settlement: existing, created: false };
    if (!(await this.isMasterEnabled())) throw new Error("ระบบเครดิตยังไม่เปิดใช้งาน");
    const ctx = await this.shopDayContext(shopId);
    if (!ctx) throw new Error("ไม่พบร้านค้า");
    if (!ctx.config.enabled) throw new Error("ร้านนี้ได้รับยกเว้นระบบเครดิต");
    const now = opts.now ?? new Date();
    const w = creditDayWindow(businessDate, ctx.cutoff);
    if (w.end.getTime() > now.getTime()) throw new Error("วันนี้ยังไม่ปิดรอบ — ตัดยอดได้หลังเวลาตัดรอบ");
    const d = ctx.config.daily;
    if (!opts.force && d.startDate && businessDate < d.startDate) throw new Error(`เริ่มคิดค่าบริการรายวันตั้งแต่ ${d.startDate}`);
    const s = await this.repo.sumSalesBetween(shopId, w.start.toISOString(), w.end.toISOString(), d.countStatuses, d.basis);
    const fee = dailyCreditFee(d, s);
    let ledgerEntryId: string | null = null;
    if (fee > 0) {
      const res = await this.repo.applyEntry({
        shopId,
        type: "deduction",
        amountSatang: -fee,
        reason: d.metric === "orders" ? `ค่าบริการรายวัน ${businessDate} (${s.orderCount} ออเดอร์)` : `ค่าบริการรายวัน ${businessDate} (ยอด ${(s.salesSatang / 100).toFixed(2)} บาท)`,
        idempotencyKey: `daily:${shopId}:${businessDate}`,
        meta: { businessDate, salesSatang: s.salesSatang, orderCount: s.orderCount, thresholdSatang: d.thresholdSatang, metric: d.metric, thresholdOrders: d.thresholdOrders, cutoff: ctx.cutoff, statuses: d.countStatuses },
      });
      ledgerEntryId = res.entry?.id ?? (await this.repo.findEntryByKey(`daily:${shopId}:${businessDate}`))?.id ?? null;
    }
    const row = await this.repo.insertSettlement({
      shopId,
      businessDate,
      periodStart: w.start.toISOString(),
      periodEnd: w.end.toISOString(),
      cutoffTime: ctx.cutoff,
      salesSatang: s.salesSatang,
      orderCount: s.orderCount,
      thresholdSatang: d.thresholdSatang,
      metric: d.metric,
      thresholdOrders: d.thresholdOrders,
      feeSatang: d.feeSatang,
      chargedSatang: fee,
      ledgerEntryId,
      settledBy: opts.by ?? "cron",
    });
    if (row) return { settlement: row, created: true };
    // Lost a race with a concurrent settle — the ledger key kept it single-charge.
    return { settlement: (await this.repo.findSettlement(shopId, businessDate))!, created: false };
  }

  /**
   * Daily job: for every non-exempt shop settle each closed business day in
   * the last `lookbackDays` (default 3) that is not settled yet. Safe to run
   * hourly — already-settled days are skipped.
   */
  async settleAllDue(now: Date = new Date(), lookbackDays = 3): Promise<{ shops: number; settled: number; charged: number; errors: number }> {
    const out = { shops: 0, settled: 0, charged: 0, errors: 0 };
    const platform = await this.getPlatformConfig();
    if (!platform.enabled) return out;
    const shops = await this.repo.listShopsForSettlement();
    for (const shop of shops) {
      out.shops++;
      try {
        const override = await this.getShopOverride(shop.id);
        const cfg = effectiveConfig(platform, override);
        if (!cfg.enabled) continue;
        const cutoff = creditCutoffFor(cfg.daily, shop.billingCutoffTime);
        const lastClosed = addDaysYmd(creditDayOf(now, cutoff), -1);
        for (let i = lookbackDays - 1; i >= 0; i--) {
          const day = addDaysYmd(lastClosed, -i);
          if (cfg.daily.startDate && day < cfg.daily.startDate) continue;
          if (await this.repo.findSettlement(shop.id, day)) continue;
          const r = await this.settleDay(shop.id, day, { by: "cron", now });
          if (r.created) {
            out.settled++;
            if (r.settlement.chargedSatang > 0) out.charged++;
          }
        }
      } catch (e) {
        out.errors++;
        console.error("[credit] daily settle failed", shop.id, (e as Error).message);
      }
    }
    return out;
  }

  async pageSettlements(shopId: string, page: number, pageSize = 20) {
    return this.repo.pageSettlements(shopId, { page, pageSize });
  }

  async getSettlement(id: string) {
    return this.repo.findSettlementById(id);
  }

  /** One-time starting credit for a newly created shop (no-op when off / 0). */
  async grantStartingCredit(shopId: string): Promise<void> {
    const p = await this.getPlatformConfig();
    if (!p.enabled || p.startingCreditSatang <= 0) return;
    await this.repo.applyEntry({
      shopId,
      type: "starting",
      amountSatang: p.startingCreditSatang,
      reason: "เครดิตเริ่มต้นร้านใหม่",
      idempotencyKey: `starting:${shopId}`,
    });
  }

  async adminAdjust(input: { shopId: string; type: "adjust" | "bonus"; amountSatang: number; reason: string; actorUserId: string }) {
    const amt = Math.round(input.amountSatang);
    if (!Number.isFinite(amt) || amt === 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
    if (input.type === "bonus" && amt < 0) throw new Error("โบนัสต้องเป็นจำนวนบวก");
    const reason = input.reason.trim();
    if (!reason) throw new Error("กรุณาระบุเหตุผล");
    if (reason.length > 300) throw new Error("เหตุผลยาวเกินไป");
    const res = await this.repo.applyEntry({ shopId: input.shopId, type: input.type, amountSatang: amt, reason, actorUserId: input.actorUserId });
    return res.entry!;
  }

  async submitTopup(input: {
    shopId: string;
    userId: string;
    packageId?: string | null;
    amountSatang?: number | null;
    note?: string | null;
    filename: string;
    contentType: string;
    bytes: Uint8Array;
  }): Promise<CreditTopup> {
    const p = await this.getPlatformConfig();
    if (!p.enabled) throw new Error("ระบบเครดิตยังไม่เปิดใช้งาน");
    if (!SLIP_TYPES.includes(input.contentType)) throw new Error("รองรับเฉพาะรูปภาพ (PNG/JPG/WEBP)");
    if (input.bytes.byteLength === 0) throw new Error("ไม่พบไฟล์สลิป");
    if (input.bytes.byteLength > MAX_SLIP_BYTES) throw new Error("ไฟล์ใหญ่เกิน 5MB");
    if (!isSupportedImage(input.bytes)) throw new Error("ไฟล์สลิปไม่ใช่รูปภาพที่รองรับ");
    const q = resolveCreditTopup(p.topup, { packageId: input.packageId, amountSatang: input.amountSatang });
    const ext = (input.filename.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const { url } = await this.slipStorage.saveObject({
      key: `credit-slips/${input.shopId}/${crypto.randomUUID()}.${ext}`,
      contentType: input.contentType,
      bytes: input.bytes,
    });
    const topup = await this.repo.createTopup({
      shopId: input.shopId,
      packageId: q.packageId,
      amountSatang: q.amountSatang,
      bonusSatang: q.bonusSatang,
      slipUrl: url,
      note: input.note?.trim().slice(0, 300) || null,
      submittedBy: input.userId,
      verifyMeta: null,
    });
    // Auto-verification hook (best-effort; never blocks the submission).
    if (p.topup.autoVerify) {
      try {
        const v = await this.verifier.verify({ topupId: topup.id, shopId: topup.shopId, amountSatang: topup.amountSatang, bytes: input.bytes, promptpayId: p.topup.promptpayId });
        await this.repo.setTopupVerifyMeta(topup.id, { ...v, at: new Date().toISOString() });
        if (v.status === "verified") return await this.reviewTopup(topup.id, "approve", "system:auto-verify", null);
      } catch (e) {
        await this.repo.setTopupVerifyMeta(topup.id, { status: "error", detail: (e as Error).message });
      }
    }
    return topup;
  }

  async reviewTopup(id: string, decision: "approve" | "reject", reviewerUserId: string, rejectReason: string | null): Promise<CreditTopup> {
    const existing = await this.repo.findTopup(id);
    if (!existing) throw new Error("ไม่พบคำขอเติมเครดิต");
    if (existing.status !== "pending") throw new Error("คำขอนี้ถูกตรวจสอบไปแล้ว");
    if (decision === "reject") {
      const reason = rejectReason?.trim();
      if (!reason) throw new Error("กรุณาระบุเหตุผลที่ปฏิเสธ");
      const r = await this.repo.claimTopup(id, "rejected", reviewerUserId, reason.slice(0, 300));
      if (!r) throw new Error("คำขอนี้ถูกตรวจสอบไปแล้ว");
      return r;
    }
    const claimed = await this.repo.claimTopup(id, "approved", reviewerUserId, null);
    if (!claimed) throw new Error("คำขอนี้ถูกตรวจสอบไปแล้ว");
    const actor = reviewerUserId.startsWith("system:") ? null : reviewerUserId;
    try {
      await this.repo.applyEntry({
        shopId: claimed.shopId,
        type: "topup",
        amountSatang: claimed.amountSatang,
        reason: "เติมเครดิต (PromptPay)",
        actorUserId: actor,
        topupId: claimed.id,
        idempotencyKey: `topup:${claimed.id}`,
      });
      if (claimed.bonusSatang > 0) {
        await this.repo.applyEntry({
          shopId: claimed.shopId,
          type: "bonus",
          amountSatang: claimed.bonusSatang,
          reason: `โบนัสแพ็กเกจ ${claimed.packageId ?? ""}`.trim(),
          actorUserId: actor,
          topupId: claimed.id,
          idempotencyKey: `topupbonus:${claimed.id}`,
        });
      }
    } catch (e) {
      // Crediting failed → put the request back so it can be retried (keys keep it single-credit).
      if (!(await this.repo.findEntryByKey(`topup:${claimed.id}`))) await this.repo.unclaimTopup(claimed.id);
      throw e;
    }
    return claimed;
  }
}
