"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireRole, requireShopWrite } from "@/src/infrastructure/auth/session";
import { UpdatePromotionsModuleSettingsUseCase } from "@/src/application/use-cases/promotions/UpdatePromotionsModuleSettingsUseCase";
import {
  CreateShopPromotionUseCase,
  UpdateShopPromotionUseCase,
  SetShopPromotionActiveUseCase,
  DeleteShopPromotionUseCase,
} from "@/src/application/use-cases/promotions/ShopPromotionCrudUseCases";
import type { UpdateShopPromotionInput } from "@/src/application/repositories/IShopPromotionRepository";

export type PromotionsActionState = {
  error?: string;
  success?: string;
};

function revalidatePromotions() {
  revalidatePath("/shop/promotions");
  revalidatePath("/shop/settings");
  revalidatePath("/admin/shops");
}

export type PromotionsInput = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
};

function readPromotionForm(formData: FormData): PromotionsInput {
  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const endsRaw = String(formData.get("endsAt") ?? "").trim();
  // `datetime-local` has no offset — reinterpret the wall time as Bangkok (+07:00).
  const toIso = (raw: string): string | null =>
    raw ? new Date(`${raw}:00+07:00`).toISOString() : null;
  const startsAt = startsRaw ? toIso(startsRaw) : null;
  const endsAt = endsRaw ? toIso(endsRaw) : null;
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("วันเริ่มต้องมาก่อนวันสิ้นสุด");
  }
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    startsAt,
    endsAt,
  };
}

/** Platform admin: allow/deny the promotions module for a shop. */
export async function setPromotionsAllowedAction(
  shopId: string,
  allowed: boolean,
): Promise<PromotionsActionState> {
  try {
    await requireRole("platform_admin");
    await container.shopRepository.setPromotionsAllowedByAdmin(shopId, allowed);
    revalidatePromotions();
    return {
      success: allowed ? "อนุญาตโมดูลโปรโมชันแล้ว" : "ปิดสิทธิ์โมดูลโปรโมชันแล้ว",
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updatePromotionsModuleAction(
  _prev: PromotionsActionState,
  formData: FormData,
): Promise<PromotionsActionState> {
  try {
    const { shopId } = await requireShopWrite();
    await new UpdatePromotionsModuleSettingsUseCase(
      container.shopRepository,
    ).execute(shopId, {
      promotionsEnabled: formData.get("promotionsEnabled") === "on",
    });
    revalidatePromotions();
    return { success: "บันทึกการตั้งค่าโปรโมชันแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function createShopPromotionAction(
  _prev: PromotionsActionState,
  formData: FormData,
): Promise<PromotionsActionState> {
  try {
    const { shopId } = await requireShopWrite();
    const input = readPromotionForm(formData);
    await new CreateShopPromotionUseCase(
      container.shopRepository,
      container.shopPromotionRepository,
    ).execute({ shopId, ...input });
    revalidatePromotions();
    return { success: "เพิ่มโปรโมชันแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateShopPromotionAction(
  _prev: PromotionsActionState,
  formData: FormData,
): Promise<PromotionsActionState> {
  try {
    const { shopId } = await requireShopWrite();
    const promotionId = String(formData.get("promotionId") ?? "");
    const input = readPromotionForm(formData);
    const partial: UpdateShopPromotionInput = {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    };
    await new UpdateShopPromotionUseCase(
      container.shopRepository,
      container.shopPromotionRepository,
    ).execute(shopId, promotionId, partial);
    revalidatePromotions();
    return { success: "อัปเดตโปรโมชันแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setShopPromotionActiveAction(
  promotionId: string,
  isActive: boolean,
): Promise<PromotionsActionState> {
  try {
    const { shopId } = await requireShopWrite();
    await new SetShopPromotionActiveUseCase(
      container.shopRepository,
      container.shopPromotionRepository,
    ).execute(shopId, promotionId, isActive);
    revalidatePromotions();
    return { success: isActive ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteShopPromotionAction(
  promotionId: string,
): Promise<PromotionsActionState> {
  try {
    const { shopId } = await requireShopWrite();
    await new DeleteShopPromotionUseCase(
      container.shopRepository,
      container.shopPromotionRepository,
    ).execute(shopId, promotionId);
    revalidatePromotions();
    return { success: "ลบโปรโมชันแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
