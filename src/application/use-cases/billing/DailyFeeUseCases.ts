import type { DailyFeeCharge, PlatformSettings } from "@/src/domain/entities";
import {
  businessDayFrom,
  dailyFeeFor,
  dayStartContaining,
  firstBillingDayStart,
  isValidCutoff,
  termsAt,
  type DailyFeeTerms,
} from "@/src/domain/services/daily-fee";
import type { IDailyFeeRepository } from "@/src/application/repositories/IDailyFeeRepository";
import type { IOrderRepository } from "@/src/application/repositories/IOrderRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type {
  IPlatformSettingsRepository,
  UpdatePlatformSettingsInput,
} from "@/src/application/repositories/IPlatformSettingsRepository";

/** Safety cap on how many closed days one read may materialise. */
const MAX_DAYS_PER_SYNC = 400;

export interface DailyFeeToday {
  businessDate: string;
  start: string;
  end: string;
  orderCount: number;
  terms: DailyFeeTerms;
  /** Fee this day will incur if it closed now (0 if not over threshold). */
  projectedFeeSatang: number;
}

export interface DailyFeeOverview {
  today: DailyFeeToday;
  /** Terms that will apply from the next business day (null = unchanged). */
  upcomingTerms: DailyFeeTerms | null;
  charges: DailyFeeCharge[];
  outstandingSatang: number;
  cutoffOverride: string | null;
}

/**
 * Materialise every closed business day (idempotent: unique shop+date, insert
 * ignores duplicates) then report today's running count + history. Lazy — it
 * runs on read (owner/admin billing pages) and from the cron job.
 */
export class SyncDailyFeesUseCase {
  constructor(
    private readonly fees: IDailyFeeRepository,
    private readonly orders: IOrderRepository,
    private readonly shops: IShopRepository,
  ) {}

  async execute(shopId: string, now: Date = new Date()): Promise<DailyFeeOverview> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const versions = await this.fees.listTermsVersions(shopId);
    const last = await this.fees.lastCharge(shopId);

    let start: Date | null = last
      ? new Date(last.periodEnd)
      : firstBillingDayStart(versions, shopId, shop.createdAt);

    if (start) {
      for (let i = 0; i < MAX_DAYS_PER_SYNC; i++) {
        const day = businessDayFrom(versions, shopId, start);
        if (day.end.getTime() > now.getTime()) break;
        const orderCount = await this.orders.countBillableBetween(
          shopId,
          day.start.toISOString(),
          day.end.toISOString(),
        );
        const amount = dailyFeeFor(orderCount, day.terms);
        await this.fees.insertCharge({
          shopId,
          businessDate: day.businessDate,
          periodStart: day.start.toISOString(),
          periodEnd: day.end.toISOString(),
          orderCount,
          enabled: day.terms.enabled,
          threshold: day.terms.threshold,
          feeSatang: day.terms.feeSatang,
          cutoffTime: day.terms.cutoffTime,
          amountSatang: amount,
          status: amount > 0 ? "due" : "none",
        });
        start = day.end;
      }
    }

    // The open (current) business day.
    const todayStart =
      start ?? dayStartContaining(now, termsAt(versions, shopId, now).cutoffTime);
    const today = businessDayFrom(versions, shopId, todayStart);
    const orderCount = await this.orders.countBillableBetween(
      shopId,
      today.start.toISOString(),
      now.toISOString(),
    );
    const nowTerms = termsAt(versions, shopId, now);
    const changed =
      nowTerms.enabled !== today.terms.enabled ||
      nowTerms.threshold !== today.terms.threshold ||
      nowTerms.feeSatang !== today.terms.feeSatang ||
      nowTerms.cutoffTime !== today.terms.cutoffTime;

    const [charges, outstandingSatang, cutoffOverride] = await Promise.all([
      this.fees.listCharges(shopId),
      this.fees.outstandingSatang(shopId),
      this.fees.getShopCutoff(shopId),
    ]);
    return {
      today: {
        businessDate: today.businessDate,
        start: today.start.toISOString(),
        end: today.end.toISOString(),
        orderCount,
        terms: today.terms,
        projectedFeeSatang: dailyFeeFor(orderCount, today.terms),
      },
      upcomingTerms: changed ? nowTerms : null,
      charges,
      outstandingSatang,
      cutoffOverride,
    };
  }
}

export interface DailyFeeSettingsInput {
  dailyFeeBillingEnabled: boolean;
  dailyOrderThreshold: number;
  dailyFeeSatang: number;
  defaultCutoffTime: string;
}

export function validateDailyFeeSettings(i: DailyFeeSettingsInput): void {
  if (!Number.isInteger(i.dailyOrderThreshold) || i.dailyOrderThreshold < 0 || i.dailyOrderThreshold > 100000) {
    throw new Error("จำนวนออเดอร์ขั้นต่ำไม่ถูกต้อง");
  }
  if (!Number.isInteger(i.dailyFeeSatang) || i.dailyFeeSatang < 0 || i.dailyFeeSatang > 10_000_000) {
    throw new Error("ค่าธรรมเนียมรายวันไม่ถูกต้อง");
  }
  if (!isValidCutoff(i.defaultCutoffTime)) throw new Error("เวลาตัดรอบต้องเป็นรูปแบบ HH:MM");
}

/**
 * Admin saves platform settings. Daily-fee fields are also appended to the
 * terms log (effective now → used from each shop's next business day).
 */
export class UpdatePlatformBillingSettingsUseCase {
  constructor(
    private readonly settings: IPlatformSettingsRepository,
    private readonly fees: IDailyFeeRepository,
  ) {}

  async execute(
    input: UpdatePlatformSettingsInput & DailyFeeSettingsInput,
    adminId: string,
    now: Date = new Date(),
  ): Promise<PlatformSettings> {
    validateDailyFeeSettings(input);
    const before = await this.settings.get();
    const after = await this.settings.update(input);
    const dailyChanged =
      before.dailyFeeBillingEnabled !== after.dailyFeeBillingEnabled ||
      before.dailyOrderThreshold !== after.dailyOrderThreshold ||
      before.dailyFeeSatang !== after.dailyFeeSatang ||
      before.defaultCutoffTime !== after.defaultCutoffTime;
    if (dailyChanged) {
      await this.fees.addTermsVersion({
        shopId: null,
        effectiveAt: now.toISOString(),
        enabled: after.dailyFeeBillingEnabled,
        threshold: after.dailyOrderThreshold,
        feeSatang: after.dailyFeeSatang,
        cutoffTime: after.defaultCutoffTime,
        createdBy: adminId,
      });
    }
    return after;
  }
}

/** Admin-only: set / clear a shop's business-day cutoff (applies next day). */
export class SetShopBillingCutoffUseCase {
  constructor(
    private readonly fees: IDailyFeeRepository,
    private readonly shops: IShopRepository,
  ) {}

  async execute(shopId: string, cutoff: string | null, adminId: string, now: Date = new Date()): Promise<void> {
    if (!(await this.shops.findById(shopId))) throw new Error("ไม่พบร้านค้า");
    const value = cutoff?.trim() || null;
    if (value !== null && !isValidCutoff(value)) throw new Error("เวลาตัดรอบต้องเป็นรูปแบบ HH:MM");
    if ((await this.fees.getShopCutoff(shopId)) === value) return;
    await this.fees.setShopCutoff(shopId, value);
    await this.fees.addTermsVersion({
      shopId,
      effectiveAt: now.toISOString(),
      enabled: true,
      threshold: 0,
      feeSatang: 0,
      cutoffTime: value,
      createdBy: adminId,
    });
  }
}

/** Admin marks a due daily charge as paid (manual — no auto-debit). */
export class MarkDailyFeePaidUseCase {
  constructor(private readonly fees: IDailyFeeRepository) {}
  async execute(shopId: string, chargeId: string, adminId: string): Promise<void> {
    if (!(await this.fees.markPaid(shopId, chargeId, adminId))) {
      throw new Error("รายการนี้ไม่อยู่ในสถานะค้างชำระ");
    }
  }
}
