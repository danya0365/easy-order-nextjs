import type { Payment } from "@/src/domain/entities";
import { computeNewExpiry } from "@/src/domain/services/topup-pricing";
import type { IPaymentRepository } from "@/src/application/repositories/IPaymentRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import type { ITopupTransactionRepository } from "@/src/application/repositories/ITopupTransactionRepository";
import type { IPaymentVerifier } from "@/src/application/services/IPaymentVerifier";

export interface VerifyPaymentInput {
  paymentId: string;
  reviewerUserId: string;
  decision: "approve" | "reject";
  rejectReason?: string | null;
}

/**
 * Resolve a pending payment via the (swappable) IPaymentVerifier. On approval,
 * extend the shop's expiry by the purchased days (+bonus) and record a ledger
 * entry. The use case is agnostic to whether verification was manual or auto.
 */
export class VerifyPaymentUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly verifier: IPaymentVerifier,
    private readonly topups: ITopupTransactionRepository,
  ) {}

  async execute(input: VerifyPaymentInput): Promise<Payment> {
    const payment = await this.payments.findById(input.paymentId);
    if (!payment) throw new Error("ไม่พบรายการชำระเงิน");
    if (payment.status !== "pending") {
      throw new Error("รายการนี้ถูกตรวจสอบไปแล้ว");
    }

    const result = await this.verifier.verify({
      paymentId: payment.id,
      shopId: payment.shopId,
      decision: input.decision,
      reviewerUserId: input.reviewerUserId,
      rejectReason: input.rejectReason,
      slipUrl: payment.slipUrl,
      expectedAmountSatang: payment.amountSatang,
    });

    const resolved = await this.payments.resolve(payment.id, {
      status: result.approved ? "approved" : "rejected",
      verifiedBy: result.verifiedBy,
      verifiedAt: result.verifiedAt,
      rejectReason: result.approved ? null : result.reason,
    });

    if (result.approved) {
      const sub = await this.subscriptions.findById(payment.subscriptionId);
      if (sub) {
        // Recompute from the LIVE expiry so a late approval (shop lapsed while
        // waiting) still grants the full purchased days from now.
        const totalDays = payment.daysToAdd + payment.bonusDays;
        const now = new Date();
        const expiryBeforeAt = sub.currentPeriodDueAt;
        const start = new Date(
          Math.max(now.getTime(), new Date(sub.currentPeriodDueAt).getTime()),
        ).toISOString();
        const expiryAfterAt = computeNewExpiry(
          sub.currentPeriodDueAt,
          totalDays,
          now,
        );

        await this.subscriptions.advancePeriod(payment.subscriptionId, {
          currentPeriodStartAt: start,
          currentPeriodDueAt: expiryAfterAt,
          status: "active",
        });

        await this.topups.create({
          shopId: payment.shopId,
          paymentId: payment.id,
          type: "topup",
          daysAdded: payment.daysToAdd,
          bonusDaysAdded: payment.bonusDays,
          amountSatang: payment.amountSatang,
          expiryBeforeAt,
          expiryAfterAt,
          performedBy: input.reviewerUserId,
        });
      }
    }

    return resolved;
  }
}
