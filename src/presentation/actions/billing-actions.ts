"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { SubmitPaymentSlipUseCase } from "@/src/application/use-cases/billing/SubmitPaymentSlipUseCase";
import { resolveTopupQuote } from "@/src/domain/services/topup-pricing";
import { renderPromptPayQR } from "@/src/infrastructure/services/promptpay";
import { satangToBaht } from "@/src/presentation/lib/money";
import type { Payment, TopupTransaction } from "@/src/domain/entities";
import type { Page } from "@/src/application/repositories/pagination";

export interface BillingFormState {
  error?: string;
  success?: string;
}

/** Next page of the shop's payment (slip) history (billing "load more"). */
export async function loadMorePaymentsAction(
  cursor: string,
): Promise<Page<Payment>> {
  const { shopId } = await requireShopWrite();
  return container.paymentRepository.pageByShop(shopId, { cursor });
}

/** Next page of the shop's day-credit ledger (top-up history "load more"). */
export async function loadMoreTopupsAction(
  cursor: string,
): Promise<Page<TopupTransaction>> {
  const { shopId } = await requireShopWrite();
  return container.topupTransactionRepository.pageByShop(shopId, {
    cursor,
  });
}

export type TopupQuoteResult =
  | {
      ok: true;
      baseDays: number;
      bonusDays: number;
      totalDays: number;
      amountSatang: number;
      fullAmountSatang: number;
      promoPercentOff: number;
      target: string;
      qrDataUrl: string;
    }
  | { ok: false; error: string };

/**
 * Resolve a top-up order server-side (authoritative price + bonus) and render
 * the matching PromptPay QR. The client uses this so the QR amount always
 * equals what the server will actually charge.
 */
export async function topupQuoteAction(input: {
  packageId: string | null;
  customDays: number | null;
}): Promise<TopupQuoteResult> {
  try {
    const { shopId } = await requireShopWrite();
    const sub = await container.subscriptionRepository.findByShop(shopId);
    if (!sub) throw new Error("ยังไม่มีแพ็กเกจสำหรับร้านนี้");

    const quote = resolveTopupQuote(input, sub.pricePerDaySatang);
    const target = process.env.PROMPTPAY_TARGET || "0000000000";
    const qrDataUrl = await renderPromptPayQR(target, quote.amountSatang);
    return {
      ok: true,
      baseDays: quote.baseDays,
      bonusDays: quote.bonusDays,
      totalDays: quote.totalDays,
      amountSatang: quote.amountSatang,
      fullAmountSatang: quote.fullAmountSatang,
      promoPercentOff: quote.promoPercentOff,
      target,
      qrDataUrl,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function submitSlipAction(
  _prev: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  try {
    // NOTE: intentionally no assertShopActive — paying must work while suspended.
    const { actor, shopId } = await requireShopWrite();

    const file = formData.get("slip");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("กรุณาแนบรูปสลิป");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());

    const packageId = String(formData.get("packageId") ?? "") || null;
    const customDaysRaw = String(formData.get("customDays") ?? "");
    const customDays = customDaysRaw ? Number(customDaysRaw) : null;

    const payment = await new SubmitPaymentSlipUseCase(
      container.paymentRepository,
      container.subscriptionRepository,
      container.slipStorage,
    ).execute({
      shopId,
      userId: actor.id,
      filename: file.name,
      contentType: file.type,
      bytes,
      packageId,
      customDays,
    });

    // Alert admins that a slip is waiting for review (best-effort).
    const shop = await container.shopRepository.findById(shopId);
    const totalDays = payment.daysToAdd + payment.bonusDays;
    await container.notificationService.notifyAdmins({
      type: "payment_submitted",
      title: "แจ้งชำระเงินใหม่",
      body: `ร้าน ${shop?.name ?? "-"} แจ้งชำระเงิน ${satangToBaht(payment.amountSatang)} บาท (เติม ${totalDays} วัน)`,
      linkUrl: "/admin/payments",
    });

    revalidatePath("/shop/billing");
    return { success: "ส่งสลิปแล้ว รอผู้ดูแลตรวจสอบ" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
