import { nanoid } from "nanoid";

import type { Payment } from "@/src/domain/entities";
import {
  resolveTopupQuote,
  computeNewExpiry,
} from "@/src/domain/services/topup-pricing";
import type { IPaymentRepository } from "@/src/application/repositories/IPaymentRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";
import { isSupportedImage } from "@/src/domain/services/image-signature";

const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic"];

export interface SubmitSlipInput {
  shopId: string;
  userId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
  /** A preset package id, or… */
  packageId?: string | null;
  /** …a custom number of days. Exactly one of the two should be provided. */
  customDays?: number | null;
}

/** Owner uploads a PromptPay slip → creates a pending payment for admin review. */
export class SubmitPaymentSlipUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly slipStorage: ISlipStorage,
  ) {}

  async execute(input: SubmitSlipInput): Promise<Payment> {
    if (!ALLOWED_TYPES.includes(input.contentType)) {
      throw new Error("รองรับเฉพาะรูปภาพ (PNG/JPG/WEBP)");
    }
    if (input.bytes.byteLength === 0) throw new Error("ไม่พบไฟล์สลิป");
    if (input.bytes.byteLength > MAX_SLIP_BYTES) {
      throw new Error("ไฟล์ใหญ่เกิน 5MB");
    }
    if (!isSupportedImage(input.bytes)) {
      throw new Error("ไฟล์สลิปไม่ใช่รูปภาพที่รองรับ (PNG/JPG/WEBP/HEIC)");
    }

    const sub = await this.subscriptions.findByShop(input.shopId);
    if (!sub) throw new Error("ยังไม่มีแพ็กเกจสำหรับร้านนี้");

    // Compute the order server-side from a package id / day count — never trust
    // a client-supplied amount.
    const quote = resolveTopupQuote(
      { packageId: input.packageId, customDays: input.customDays },
      sub.pricePerDaySatang,
    );

    // Snapshot of the expiry this top-up would set if approved now. Stacks onto
    // remaining time. Approval recomputes from the then-current expiry.
    const now = new Date();
    const start = new Date(
      Math.max(now.getTime(), new Date(sub.currentPeriodDueAt).getTime()),
    ).toISOString();
    const due = computeNewExpiry(sub.currentPeriodDueAt, quote.totalDays, now);

    const key = nanoid();
    const { url } = await this.slipStorage.save({
      shopId: input.shopId,
      paymentId: key,
      filename: input.filename,
      contentType: input.contentType,
      bytes: input.bytes,
    });

    return this.payments.create({
      shopId: input.shopId,
      subscriptionId: sub.id,
      amountSatang: quote.amountSatang,
      daysToAdd: quote.baseDays,
      bonusDays: quote.bonusDays,
      packageId: quote.packageId,
      slipUrl: url,
      submittedBy: input.userId,
      coversPeriodStartAt: start,
      coversPeriodDueAt: due,
    });
  }
}
