/**
 * The payment-verification abstraction.
 *
 * Phase 1 ships a manual implementation (admin approves/rejects an uploaded
 * slip). A future auto-verify provider (bank slip API, PSP webhook, etc.) can
 * implement this same interface and be swapped in the DI container without any
 * change to VerifyPaymentUseCase, the repositories, or the schema.
 */
export interface PaymentVerificationInput {
  paymentId: string;
  shopId: string;
  /** Manual verifiers honor this; an auto verifier inspects the slip instead. */
  decision: "approve" | "reject";
  /** platform_admin id for manual review; null/provider-id for automated. */
  reviewerUserId: string | null;
  rejectReason?: string | null;
  slipUrl: string;
  expectedAmountSatang: number;
}

export interface PaymentVerificationResult {
  approved: boolean;
  reason?: string | null;
  verifiedBy: string | null;
  /** ISO-8601 timestamp of the decision. */
  verifiedAt: string;
}

export interface IPaymentVerifier {
  verify(input: PaymentVerificationInput): Promise<PaymentVerificationResult>;
}
