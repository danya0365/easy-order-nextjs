import {
  bangkokPeriodStarts,
  computeDeduction,
  effectiveConfig,
  normalizePlatformConfig,
  normalizeShopOverride,
  orderGate,
  resolveCreditTopup,
  shouldDeductAt,
  type CreditGate,
  type CreditPlatformConfig,
  type CreditShopOverride,
  type EffectiveCreditConfig,
} from "@/src/domain/services/credit";
import type { CreditLedgerEntry, CreditTopup, ICreditRepository } from "@/src/application/repositories/ICreditRepository";
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

export interface OrderCreditEvent {
  id: string;
  shopId: string;
  status: string;
  totalSatang: number;
  subtotalSatang: number;
  orderNo?: number;
}

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
    const graceUsed = config.enabled && balanceSatang <= 0 && config.lowBalance.mode === "grace" ? await this.repo.graceUsed(shopId) : 0;
    const gate = config.enabled ? orderGate(config.lowBalance, balanceSatang, graceUsed) : { allowed: true, level: "ok" as const };
    return { enabled: config.enabled, balanceSatang, gate, config };
  }

  /** Throws CreditBlockedError if the shop's credit rule blocks new orders. */
  async assertCanTakeOrder(shopId: string): Promise<void> {
    if (!(await this.isMasterEnabled())) return;
    const s = await this.getStatus(shopId);
    if (s.enabled && !s.gate.allowed) throw new CreditBlockedError();
  }

  /**
   * React to an order reaching a status: deduct at the configured trigger,
   * refund on cancel. Idempotent via deduct:/refund: keys.
   */
  async onOrderEvent(order: OrderCreditEvent): Promise<CreditLedgerEntry | null> {
    // Fast path: master off → nothing to deduct. Cancels still look for a past
    // deduction to refund (rare event, so the extra read is fine).
    if (order.status !== "cancelled" && !(await this.isMasterEnabled())) return null;
    const cfg = await this.getEffective(order.shopId);
    if (order.status === "cancelled") return this.refundOrder(order, cfg);
    if (!cfg.enabled) return null;
    if (!shouldDeductAt(cfg.deduction.trigger, order.status)) return null;
    const key = `deduct:${order.id}`;
    if (await this.repo.findEntryByKey(key)) return null;
    const { dayStart, monthStart } = bangkokPeriodStarts(new Date());
    const [usedToday, usedMonth] = await Promise.all([
      cfg.deduction.freePerDay > 0 ? this.repo.countDeductionsSince(order.shopId, dayStart) : Promise.resolve(0),
      cfg.deduction.freePerMonth > 0 ? this.repo.countDeductionsSince(order.shopId, monthStart) : Promise.resolve(0),
    ]);
    const base = cfg.deduction.basis === "subtotal" ? order.subtotalSatang : order.totalSatang;
    const q = computeDeduction(cfg.deduction, base, usedToday, usedMonth);
    const res = await this.repo.applyEntry({
      shopId: order.shopId,
      type: "deduction",
      amountSatang: -q.amountSatang,
      reason: q.free ? `ออเดอร์ฟรีตามโควตา (${q.reason})` : `หักค่าบริการออเดอร์${order.orderNo ? ` #${order.orderNo}` : ""}`,
      orderId: order.id,
      idempotencyKey: key,
      meta: { rule: cfg.deduction.mode, trigger: cfg.deduction.trigger, baseSatang: base, free: q.free, quota: q.reason },
    });
    return res.applied ? res.entry : null;
  }

  private async refundOrder(order: OrderCreditEvent, cfg: EffectiveCreditConfig): Promise<CreditLedgerEntry | null> {
    // Refund rule follows the shop's config at cancel time; a refund is only
    // ever issued against a real (non-zero) deduction for this order.
    if (!cfg.deduction.refundOnCancel) return null;
    const ded = await this.repo.findEntryByKey(`deduct:${order.id}`);
    if (!ded || ded.amountSatang >= 0) return null;
    const res = await this.repo.applyEntry({
      shopId: order.shopId,
      type: "refund",
      amountSatang: -ded.amountSatang,
      reason: `คืนเครดิต: ยกเลิกออเดอร์${order.orderNo ? ` #${order.orderNo}` : ""}`,
      orderId: order.id,
      idempotencyKey: `refund:${order.id}`,
      meta: { deductionId: ded.id },
    });
    return res.applied ? res.entry : null;
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
