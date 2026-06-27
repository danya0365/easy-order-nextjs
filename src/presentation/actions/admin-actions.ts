"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import {
  requireRole,
  startImpersonation,
  stopImpersonation,
  getImpersonation,
} from "@/src/infrastructure/auth/session";
import { VerifyPaymentUseCase } from "@/src/application/use-cases/billing/VerifyPaymentUseCase";
import { CreateShopUseCase } from "@/src/application/use-cases/shop/CreateShopUseCase";
import { PauseShopUseCase } from "@/src/application/use-cases/billing/PauseShopUseCase";
import { ResumeShopUseCase } from "@/src/application/use-cases/billing/ResumeShopUseCase";
import { ResetPasswordUseCase } from "@/src/application/use-cases/auth/ResetPasswordUseCase";
import { ResetPeerTwoFactorUseCase } from "@/src/application/use-cases/auth/ResetPeerTwoFactorUseCase";
import { assertPasswordAcceptable } from "@/src/application/use-cases/auth/password-policy";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import { bahtToSatang, satangToBaht } from "@/src/presentation/lib/money";
import { buildShopHandoff } from "@/src/presentation/lib/build-shop-handoff";
import type { ShopHandoff } from "@/src/presentation/lib/shop-handoff";
import type { Page } from "@/src/application/repositories/pagination";
import type { PendingPaymentRow } from "@/src/presentation/components/admin/AdminPaymentQueue";

export interface AdminFormState {
  error?: string;
  success?: string;
  /** Present after a successful create — credentials to hand the owner (once). */
  handoff?: ShopHandoff;
}

/** Next page of the pending-payment review queue (admin "load more"). */
export async function loadMorePendingPaymentsAction(
  cursor: string,
): Promise<Page<PendingPaymentRow>> {
  await requireRole("platform_admin");
  const page = await container.paymentRepository.pageByStatus("pending", {
    cursor,
  });
  const shops = await container.shopRepository.list();
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  return {
    items: page.items.map((payment) => ({
      payment,
      shopName: shopName.get(payment.shopId) ?? payment.shopId,
    })),
    nextCursor: page.nextCursor,
  };
}

export async function createShopAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  try {
    await requireRole("platform_admin");
    const ownerPassword = String(formData.get("ownerPassword") ?? "");
    const ownerEmail = String(formData.get("ownerEmail") ?? "");
    await assertPasswordAcceptable(ownerPassword, container.passwordBreachChecker);
    const { shop } = await new CreateShopUseCase(
      container.shopRepository,
      container.userRepository,
      container.subscriptionRepository,
      container.passwordHasher,
      container.branchRepository,
    ).execute({
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      ownerEmail,
      ownerPassword,
      pricePerDaySatang: bahtToSatang(
        Number(formData.get("pricePerDayBaht") ?? 0),
      ),
      promptpayTarget: String(formData.get("promptpayTarget") ?? "") || null,
    });
    revalidatePath("/admin/shops");
    return {
      success: "สร้างร้านค้าและบัญชีเจ้าของร้านแล้ว",
      handoff: await buildShopHandoff({
        shopName: shop.name,
        slug: shop.slug,
        ownerEmail,
        ownerPassword,
      }),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Build the credentials handoff for an EXISTING shop (no password — only a hash
 * is stored, so the sheet shows a placeholder for the admin to fill in by hand).
 */
export async function getShopHandoffAction(
  shopId: string,
): Promise<{ handoff?: ShopHandoff; error?: string }> {
  try {
    await requireRole("platform_admin");
    const shop = await container.shopRepository.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const members = await container.userRepository.listByShop(shopId);
    const owner = members.find((u) => u.role === "shop_owner");
    if (!owner) throw new Error("ไม่พบบัญชีเจ้าของร้าน");
    const handoff = await buildShopHandoff({
      shopName: shop.name,
      slug: shop.slug,
      ownerEmail: owner.email,
      ownerPassword: "", // placeholder — real password is not retrievable
    });
    return { handoff };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function verifyPaymentAction(
  paymentId: string,
  decision: "approve" | "reject",
  rejectReason?: string,
): Promise<void> {
  const admin = await requireRole("platform_admin");
  const payment = await new VerifyPaymentUseCase(
    container.paymentRepository,
    container.subscriptionRepository,
    container.paymentVerifier,
    container.topupTransactionRepository,
  ).execute({ paymentId, reviewerUserId: admin.id, decision, rejectReason });

  await container.auditLogger.record({
    actorUserId: admin.id,
    actorRole: admin.role,
    action: AUDIT_ACTIONS.paymentVerified,
    targetType: "payment",
    targetId: paymentId,
    shopId: payment.shopId,
    ip: await getClientIp(),
    metadata: { decision, status: payment.status },
  });

  // Tell the shop owner the outcome (best-effort: in-app + LINE).
  const amount = satangToBaht(payment.amountSatang);
  if (payment.status === "approved") {
    await container.notificationService.notifyShopOwner(payment.shopId, {
      type: "payment_approved",
      title: "อนุมัติการชำระเงินแล้ว ✅",
      body: `ชำระเงิน ${amount} บาท ได้รับการอนุมัติ — เติมวันใช้งานเรียบร้อย`,
      linkUrl: "/shop/billing",
    });
  } else {
    await container.notificationService.notifyShopOwner(payment.shopId, {
      type: "payment_rejected",
      title: "การชำระเงินถูกปฏิเสธ",
      body: payment.rejectReason
        ? `ชำระเงิน ${amount} บาท ถูกปฏิเสธ — เหตุผล: ${payment.rejectReason}`
        : `ชำระเงิน ${amount} บาท ถูกปฏิเสธ กรุณาตรวจสอบและส่งใหม่`,
      linkUrl: "/shop/billing",
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/shops");
}

export async function setShopStatusAction(
  shopId: string,
  status: "active" | "suspended_by_admin",
): Promise<void> {
  const admin = await requireRole("platform_admin");
  await container.shopRepository.setStatus(shopId, status);
  await container.auditLogger.record({
    actorUserId: admin.id,
    actorRole: admin.role,
    action: AUDIT_ACTIONS.shopStatusChanged,
    targetType: "shop",
    targetId: shopId,
    shopId,
    ip: await getClientIp(),
    metadata: { status },
  });
  revalidatePath("/admin/shops");
}

/** Admin pauses a shop (freeze billing days). */
export async function pauseShopAction(shopId: string): Promise<void> {
  const admin = await requireRole("platform_admin");
  await new PauseShopUseCase(
    container.shopRepository,
    container.subscriptionRepository,
  ).execute(shopId);
  await container.auditLogger.record({
    actorUserId: admin.id,
    actorRole: admin.role,
    action: AUDIT_ACTIONS.shopPaused,
    targetType: "shop",
    targetId: shopId,
    shopId,
    ip: await getClientIp(),
  });
  revalidatePath("/admin/shops");
}

/** Admin resumes a paused shop. */
export async function resumeShopAction(shopId: string): Promise<void> {
  const admin = await requireRole("platform_admin");
  await new ResumeShopUseCase(container.subscriptionRepository).execute(shopId);
  await container.auditLogger.record({
    actorUserId: admin.id,
    actorRole: admin.role,
    action: AUDIT_ACTIONS.shopResumed,
    targetType: "shop",
    targetId: shopId,
    shopId,
    ip: await getClientIp(),
  });
  revalidatePath("/admin/shops");
}

/** Admin starts a READ-ONLY "view as shop" session (support/debugging). */
export async function startImpersonationAction(shopId: string): Promise<void> {
  const admin = await requireRole("platform_admin");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) throw new Error("ไม่พบร้านค้า");
  await startImpersonation(shopId, admin.id);
  await container.auditLogger.record({
    actorUserId: admin.id,
    actorRole: admin.role,
    action: AUDIT_ACTIONS.impersonationStarted,
    targetType: "shop",
    targetId: shopId,
    shopId,
    ip: await getClientIp(),
    metadata: { shopName: shop.name },
  });
  // High-risk: notify every admin that someone is viewing a tenant's screens.
  await container.notificationService.notifyAdmins({
    type: "security_alert",
    title: "👁️ เริ่มดูร้านแบบ admin (impersonation)",
    body: `${admin.email} กำลังดูหน้าจอในนามร้าน ${shop.name} (อ่านอย่างเดียว)`,
    linkUrl: "/admin/security",
  });
  redirect("/shop");
}

/** Admin exits "view as shop". */
export async function stopImpersonationAction(): Promise<void> {
  const admin = await requireRole("platform_admin");
  const imp = await getImpersonation();
  await stopImpersonation();
  if (imp) {
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.impersonationStopped,
      targetType: "shop",
      targetId: imp.shopId,
      shopId: imp.shopId,
      ip: await getClientIp(),
    });
  }
  redirect("/admin/shops");
}

/** Break-glass: an admin resets another admin's 2FA (lost device + codes). */
export async function resetPeerTwoFactorAction(
  userId: string,
): Promise<{ error?: string }> {
  try {
    const admin = await requireRole("platform_admin");
    if (userId === admin.id) {
      throw new Error(
        "รีเซ็ต 2FA ของตัวเองที่นี่ไม่ได้ — ใช้สคริปต์ break-glass (npm run reset-2fa)",
      );
    }
    const target = await new ResetPeerTwoFactorUseCase(
      container.userRepository,
      container.sessionRepository,
    ).execute(userId);
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.twoFactorResetByAdmin,
      targetType: "user",
      targetId: userId,
      ip: await getClientIp(),
      metadata: { targetEmail: target.email },
    });
    // Tell every admin — a 2FA reset on a peer is high-risk (insider/compromise).
    await container.notificationService.notifyAdmins({
      type: "security_alert",
      title: "⚠️ มีการรีเซ็ต 2FA ของผู้ดูแลระบบ",
      body: `${admin.email} รีเซ็ตการยืนยัน 2 ชั้นของ ${target.email}`,
      linkUrl: "/admin/security",
    });
    revalidatePath("/admin/security");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin force-logs-out a user from all devices (e.g. a compromised account). */
export async function forceLogoutUserAction(
  userId: string,
): Promise<{ error?: string }> {
  try {
    const admin = await requireRole("platform_admin");
    const target = await container.userRepository.findById(userId);
    if (!target) throw new Error("ไม่พบบัญชีผู้ใช้");
    await container.sessionRepository.deleteAllForUser(userId);
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.forceLogout,
      targetType: "user",
      targetId: userId,
      shopId: target.shopId,
      ip: await getClientIp(),
    });
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin sets a new password for a shop owner (e.g. they forgot it). */
export async function adminResetOwnerPasswordAction(
  userId: string,
  newPassword: string,
): Promise<{ error?: string }> {
  try {
    const admin = await requireRole("platform_admin");
    const target = await container.userRepository.findById(userId);
    if (!target || target.role !== "shop_owner") {
      throw new Error("ไม่พบบัญชีเจ้าของร้าน");
    }
    await new ResetPasswordUseCase(
      container.userRepository,
      container.passwordHasher,
      container.sessionRepository,
      container.passwordBreachChecker,
    ).execute(userId, newPassword);
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.passwordResetByAdmin,
      targetType: "user",
      targetId: userId,
      shopId: target.shopId,
      ip: await getClientIp(),
    });
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
