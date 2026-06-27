import "server-only";

import type {
  IPaymentVerifier,
  PaymentVerificationInput,
  PaymentVerificationResult,
} from "@/src/application/services/IPaymentVerifier";

/**
 * Phase-1 verifier: trusts the platform admin's manual decision on the
 * uploaded slip. No external calls. A future provider (bank slip API/PSP)
 * implements the same interface and is swapped in the DI container.
 */
export class ManualSlipPaymentVerifier implements IPaymentVerifier {
  async verify(
    input: PaymentVerificationInput,
  ): Promise<PaymentVerificationResult> {
    const approved = input.decision === "approve";
    return {
      approved,
      reason: approved ? null : (input.rejectReason ?? "ปฏิเสธโดยผู้ดูแล"),
      verifiedBy: input.reviewerUserId,
      verifiedAt: new Date().toISOString(),
    };
  }
}
