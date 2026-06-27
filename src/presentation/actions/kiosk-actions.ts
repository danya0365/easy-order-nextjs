"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import {
  startKioskSession,
  endKioskSession,
  getKioskShopId,
} from "@/src/infrastructure/auth/kiosk";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import { SetKioskPinUseCase } from "@/src/application/use-cases/kiosk/SetKioskPinUseCase";
import { VerifyKioskPinUseCase } from "@/src/application/use-cases/kiosk/VerifyKioskPinUseCase";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";

export interface FormState {
  error?: string;
  success?: string;
}

/** Owner sets/changes the kiosk PIN (required to exit kiosk mode). */
export async function setKioskPinAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new SetKioskPinUseCase(
      container.shopRepository,
      container.passwordHasher,
    ).execute(shopId, String(formData.get("pin") ?? ""));
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.kioskPinSet,
      targetType: "shop",
      targetId: shopId,
      shopId,
      ip: await getClientIp(),
    });
    revalidatePath("/shop/settings");
    return { success: "ตั้ง PIN หน้าร้านแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Owner turns THIS device into a kiosk for their shop, then we redirect to the
 * customer-facing menu. Requires a kiosk PIN to be set first (so the device can
 * be exited later). The owner must be authenticated here — that's the proof the
 * device was set up by the shop.
 */
export async function activateKioskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await assertShopActive(shopId);
    const shop = await container.shopRepository.findById(shopId);
    if (!shop?.hasKioskPin) {
      return { error: "กรุณาตั้ง PIN หน้าร้านก่อนเปิดโหมดหน้าร้าน" };
    }
    const label = String(formData.get("label") ?? "").trim() || null;
    await startKioskSession(shopId, label);
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.kioskActivated,
      targetType: "shop",
      targetId: shopId,
      shopId,
      ip: await getClientIp(),
      metadata: label ? { label } : undefined,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect("/kiosk");
}

/** Exit kiosk mode on this device — requires the shop's kiosk PIN. */
export async function exitKioskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let exited = false;
  try {
    const shopId = await getKioskShopId();
    if (!shopId) {
      exited = true; // already not in kiosk mode
    } else {
      const ok = await new VerifyKioskPinUseCase(
        container.shopRepository,
        container.passwordHasher,
      ).execute(shopId, String(formData.get("pin") ?? ""));
      if (!ok) return { error: "PIN ไม่ถูกต้อง" };
      await endKioskSession();
      await container.auditLogger.record({
        action: AUDIT_ACTIONS.kioskExited,
        targetType: "shop",
        targetId: shopId,
        shopId,
        ip: await getClientIp(),
      });
      exited = true;
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (exited) redirect("/login");
  return {};
}
