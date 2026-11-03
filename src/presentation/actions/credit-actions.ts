"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireRole, requireShopWrite } from "@/src/infrastructure/auth/session";
import { resolveCreditTopup } from "@/src/domain/services/credit";
import { renderPromptPayQR } from "@/src/infrastructure/services/promptpay";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import { bahtToSatang, satangToBaht } from "@/src/presentation/lib/money";

export interface CreditFormState {
  error?: string;
  success?: string;
}

const fail = (e: unknown): CreditFormState => ({ error: (e as Error).message || "เกิดข้อผิดพลาด" });

async function audit(actor: { id: string; role: string }, action: string, shopId: string | null, targetId: string | null, metadata: Record<string, unknown>) {
  await container.auditLogger
    .record({ actorUserId: actor.id, actorRole: actor.role as never, action, targetType: "credit", targetId, shopId, ip: await getClientIp(), metadata })
    .catch(() => {});
}

function revalidateCredit(shopId?: string) {
  revalidatePath("/shop/credit");
  revalidatePath("/shop");
  revalidatePath("/admin/credit");
  revalidatePath("/admin/credit/topups");
  if (shopId) revalidatePath(`/admin/credit/shops/${shopId}`);
}

export type CreditQuoteResult =
  | { ok: true; amountSatang: number; bonusSatang: number; target: string; qrDataUrl: string | null }
  | { ok: false; error: string };

/** Authoritative topup amount + bonus and the matching PromptPay QR. */
export async function creditTopupQuoteAction(input: { packageId: string | null; amountBaht: number | null }): Promise<CreditQuoteResult> {
  try {
    await requireShopWrite();
    const cfg = await container.creditService.getPlatformConfig();
    if (!cfg.enabled) throw new Error("ระบบเครดิตยังไม่เปิดใช้งาน");
    const q = resolveCreditTopup(cfg.topup, {
      packageId: input.packageId,
      amountSatang: input.amountBaht != null ? bahtToSatang(input.amountBaht) : null,
    });
    const target = cfg.topup.promptpayId || process.env.PROMPTPAY_TARGET || "";
    const qrDataUrl = target ? await renderPromptPayQR(target, q.amountSatang) : null;
    return { ok: true, amountSatang: q.amountSatang, bonusSatang: q.bonusSatang, target, qrDataUrl };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function submitCreditTopupAction(_prev: CreditFormState, formData: FormData): Promise<CreditFormState> {
  try {
    const { actor, shopId } = await requireShopWrite();
    const file = formData.get("slip");
    if (!(file instanceof File) || file.size === 0) throw new Error("กรุณาแนบรูปสลิป");
    const packageId = String(formData.get("packageId") ?? "") || null;
    const amountRaw = String(formData.get("amountBaht") ?? "");
    const topup = await container.creditService.submitTopup({
      shopId,
      userId: actor.id,
      packageId,
      amountSatang: !packageId && amountRaw ? bahtToSatang(Number(amountRaw)) : null,
      note: String(formData.get("note") ?? ""),
      filename: file.name,
      contentType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    const shop = await container.shopRepository.findById(shopId);
    await container.notificationService
      .notifyAdmins({
        type: "payment_submitted",
        title: "คำขอเติมเครดิตใหม่",
        body: `ร้าน ${shop?.name ?? "-"} แจ้งเติมเครดิต ${satangToBaht(topup.amountSatang)} บาท`,
        linkUrl: `/admin/credit/topups/${topup.id}`,
      })
      .catch(() => {});
    await audit(actor, "credit.topup_submitted", shopId, topup.id, { amountSatang: topup.amountSatang, packageId });
    revalidateCredit(shopId);
    return { success: topup.status === "approved" ? "เติมเครดิตสำเร็จ" : "ส่งสลิปแล้ว รอผู้ดูแลตรวจสอบ" };
  } catch (e) {
    return fail(e);
  }
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function saveCreditConfigAction(json: string): Promise<CreditFormState> {
  try {
    const admin = await requireRole("platform_admin");
    const cfg = await container.creditService.savePlatformConfig(JSON.parse(json), admin.id);
    await audit(admin, "credit.config_updated", null, "platform", { enabled: cfg.enabled, thresholdSatang: cfg.daily.thresholdSatang, feeSatang: cfg.daily.feeSatang, low: cfg.lowBalance.mode });
    revalidatePath("/admin/credit/settings");
    revalidateCredit();
    return { success: "บันทึกการตั้งค่าแล้ว" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveCreditOverrideAction(shopId: string, json: string | null): Promise<CreditFormState> {
  try {
    const admin = await requireRole("platform_admin");
    if (!(await container.shopRepository.findById(shopId))) throw new Error("ไม่พบร้านค้า");
    await container.creditService.saveShopOverride(shopId, json ? JSON.parse(json) : null, admin.id);
    await audit(admin, "credit.override_updated", shopId, shopId, { cleared: !json });
    revalidateCredit(shopId);
    return { success: json ? "บันทึกค่าเฉพาะร้านแล้ว" : "กลับไปใช้ค่าเริ่มต้นของแพลตฟอร์มแล้ว" };
  } catch (e) {
    return fail(e);
  }
}

export async function adjustCreditAction(_prev: CreditFormState, formData: FormData): Promise<CreditFormState> {
  try {
    const admin = await requireRole("platform_admin");
    const shopId = String(formData.get("shopId") ?? "");
    if (!(await container.shopRepository.findById(shopId))) throw new Error("ไม่พบร้านค้า");
    const kind = String(formData.get("kind") ?? "credit");
    const baht = Number(formData.get("amountBaht") ?? 0);
    if (!Number.isFinite(baht) || baht <= 0) throw new Error("จำนวนเงินต้องมากกว่า 0");
    const amount = bahtToSatang(baht) * (kind === "deduct" ? -1 : 1);
    const entry = await container.creditService.adminAdjust({
      shopId,
      type: kind === "bonus" ? "bonus" : "adjust",
      amountSatang: amount,
      reason: String(formData.get("reason") ?? ""),
      actorUserId: admin.id,
    });
    await audit(admin, "credit.adjusted", shopId, entry.id, { kind, amountSatang: amount });
    revalidateCredit(shopId);
    return { success: `บันทึกแล้ว ยอดคงเหลือ ${satangToBaht(entry.balanceAfterSatang)} บาท` };
  } catch (e) {
    return fail(e);
  }
}

export async function reviewCreditTopupAction(topupId: string, decision: "approve" | "reject", reason: string | null): Promise<CreditFormState> {
  try {
    const admin = await requireRole("platform_admin");
    const t = await container.creditService.reviewTopup(topupId, decision, admin.id, reason);
    await audit(admin, "credit.topup_reviewed", t.shopId, t.id, { decision });
    const amount = satangToBaht(t.amountSatang + (decision === "approve" ? t.bonusSatang : 0));
    await container.notificationService
      .notifyShopOwner(t.shopId, {
        type: decision === "approve" ? "payment_approved" : "payment_rejected",
        title: decision === "approve" ? "เติมเครดิตสำเร็จ" : "คำขอเติมเครดิตถูกปฏิเสธ",
        body: decision === "approve" ? `ได้รับเครดิต ${amount} บาทแล้ว` : `เติมเครดิต ${satangToBaht(t.amountSatang)} บาท ถูกปฏิเสธ — ${t.rejectReason ?? ""}`,
        linkUrl: "/shop/credit",
      })
      .catch(() => {});
    revalidatePath(`/admin/credit/topups/${topupId}`);
    revalidateCredit(t.shopId);
    return { success: decision === "approve" ? "อนุมัติและเติมเครดิตแล้ว" : "ปฏิเสธคำขอแล้ว" };
  } catch (e) {
    return fail(e);
  }
}

/** Admin test/backfill: settle one closed business day for a shop (idempotent). */
export async function settleCreditDayAction(shopId: string, businessDate: string): Promise<CreditFormState> {
  try {
    const admin = await requireRole("platform_admin");
    const r = await container.creditService.settleDay(shopId, businessDate, { by: `admin:${admin.id}`, force: true });
    if (r.created) {
      await audit(admin, "credit.daily_settled", null, shopId, { businessDate, chargedSatang: r.settlement.chargedSatang, salesSatang: r.settlement.salesSatang });
    }
    revalidatePath(`/admin/credit/shops/${shopId}`);
    revalidateCredit();
    const baht = (n: number) => (n / 100).toFixed(2);
    if (!r.created) return { success: `วันที่ ${businessDate} ตัดยอดไปแล้ว (หัก ${baht(r.settlement.chargedSatang)} บาท)` };
    return {
      success: r.settlement.chargedSatang > 0
        ? `ตัดยอด ${businessDate}: ยอดขาย ${baht(r.settlement.salesSatang)} บาท — หัก ${baht(r.settlement.chargedSatang)} บาท`
        : `ตัดยอด ${businessDate}: ยอดขาย ${baht(r.settlement.salesSatang)} บาท — ไม่ถึงเกณฑ์ ไม่หัก`,
    };
  } catch (e) {
    return fail(e);
  }
}
