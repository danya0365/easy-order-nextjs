"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireRole } from "@/src/infrastructure/auth/session";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { AdminUpdateShopContactUseCase } from "@/src/application/use-cases/shop/AdminUpdateShopContactUseCase";
import { getClientIp } from "@/src/presentation/lib/request-ip";

export interface AdminConfigState {
  error?: string;
  success?: string;
}

/** Platform admin: set a shop's public phone / PromptPay / LINE / Facebook. */
export async function adminUpdateShopContactAction(
  _prev: AdminConfigState,
  formData: FormData,
): Promise<AdminConfigState> {
  try {
    const admin = await requireRole("platform_admin");
    const shopId = String(formData.get("shopId") ?? "");
    const saved = await new AdminUpdateShopContactUseCase(
      container.shopRepository,
      container.shopProfileRepository,
    ).execute(shopId, {
      phone: String(formData.get("phone") ?? ""),
      promptpayTarget: String(formData.get("promptpayTarget") ?? ""),
      line: String(formData.get("line") ?? ""),
      facebookUrl: String(formData.get("facebookUrl") ?? ""),
    });
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.shopContactUpdatedByAdmin,
      targetType: "shop",
      targetId: shopId,
      shopId,
      ip: await getClientIp(),
      // Which fields are set (not the values — PromptPay ids are personal data).
      metadata: {
        phone: !!saved.phone,
        promptpay: !!saved.promptpayTarget,
        line: !!saved.lineUrl,
        facebook: !!saved.facebookUrl,
      },
    });
    revalidatePath(`/admin/shops/${shopId}`);
    const shop = await container.shopRepository.findById(shopId);
    if (shop) {
      revalidatePath(`/s/${shop.slug}`);
      revalidatePath(`/s/${shop.slug}/order`);
    }
    return { success: "saved" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Platform feature switches (menu options, item detail). Platform admin only. */
export async function updatePlatformFeatureSwitchesAction(
  _prev: AdminConfigState,
  formData: FormData,
): Promise<AdminConfigState> {
  try {
    const admin = await requireRole("platform_admin");
    const menuOptionsEnabled = formData.get("menuOptionsEnabled") === "on";
    const itemDetailEnabled = formData.get("itemDetailEnabled") === "on";
    await container.platformSettingsRepository.update({ menuOptionsEnabled, itemDetailEnabled });
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.platformSettingsUpdated,
      targetType: "platform_settings",
      targetId: "default",
      ip: await getClientIp(),
      metadata: { settings: "features", menuOptionsEnabled, itemDetailEnabled },
    });
    revalidatePath("/admin/settings");
    return { success: "saved" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin per-shop switch: allow menu options/add-ons for this shop. */
export async function setShopMenuOptionsAllowedAction(
  shopId: string,
  allowed: boolean,
): Promise<AdminConfigState> {
  try {
    const admin = await requireRole("platform_admin");
    await container.shopRepository.setMenuOptionsAllowedByAdmin(shopId, allowed);
    await container.auditLogger.record({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: AUDIT_ACTIONS.shopFeatureToggledByAdmin,
      targetType: "shop",
      targetId: shopId,
      shopId,
      ip: await getClientIp(),
      metadata: { feature: "menu_options", allowed },
    });
    revalidatePath(`/admin/shops/${shopId}`);
    revalidatePath("/shop/menu");
    return { success: "saved" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
