"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import {
  requireRole,
  requireShopWrite,
  operatorContext,
} from "@/src/infrastructure/auth/session";
import { CreateStampTypeUseCase } from "@/src/application/use-cases/loyalty/CreateStampTypeUseCase";
import { UpdateStampTypeUseCase } from "@/src/application/use-cases/loyalty/UpdateStampTypeUseCase";
import { SetStampTypeActiveUseCase } from "@/src/application/use-cases/loyalty/SetStampTypeActiveUseCase";
import { AddStampsUseCase } from "@/src/application/use-cases/loyalty/AddStampsUseCase";
import { RedeemStampRewardUseCase } from "@/src/application/use-cases/loyalty/RedeemStampRewardUseCase";
import { GetCustomerStampCardUseCase } from "@/src/application/use-cases/loyalty/GetCustomerStampCardUseCase";
import { UpdateLoyaltyModuleSettingsUseCase } from "@/src/application/use-cases/loyalty/UpdateLoyaltyModuleSettingsUseCase";
import { UpdatePointsSettingsUseCase } from "@/src/application/use-cases/loyalty/UpdatePointsSettingsUseCase";
import { UpsertPointsRewardUseCase } from "@/src/application/use-cases/loyalty/UpsertPointsRewardUseCase";
import { AddPointsUseCase } from "@/src/application/use-cases/loyalty/AddPointsUseCase";
import { RedeemPointsRewardUseCase } from "@/src/application/use-cases/loyalty/RedeemPointsRewardUseCase";
import type { CustomerStampCardView } from "@/src/domain/entities";

export type LoyaltyActionState = {
  error?: string;
  success?: string;
  card?: CustomerStampCardView;
  points?: number;
};

function revalidateLoyalty() {
  revalidatePath("/shop/loyalty");
  revalidatePath("/shop/loyalty/stamps");
  revalidatePath("/shop/loyalty/points");
  revalidatePath("/shop/settings");
  revalidatePath("/admin/shops");
}

/** Platform admin: allow/deny loyalty module for a shop. */
export async function setLoyaltyAllowedAction(
  shopId: string,
  allowed: boolean,
): Promise<LoyaltyActionState> {
  try {
    await requireRole("platform_admin");
    await container.shopRepository.setLoyaltyAllowedByAdmin(shopId, allowed);
    revalidateLoyalty();
    return { success: allowed ? "อนุญาตระบบสะสมแล้ว" : "ปิดสิทธิ์ระบบสะสมแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateLoyaltyModuleAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await requireShopWrite();
    await new UpdateLoyaltyModuleSettingsUseCase(
      container.shopRepository,
      container.loyaltyStampTypeRepository,
    ).execute(shopId, {
      loyaltyEnabled: formData.get("loyaltyEnabled") === "on",
      stampCardEnabled: formData.get("stampCardEnabled") === "on",
      spendPointsEnabled: formData.get("spendPointsEnabled") === "on",
    });
    revalidateLoyalty();
    return { success: "บันทึกการตั้งค่าสะสมแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function createStampTypeAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await requireShopWrite();
    const priceRaw = String(formData.get("priceBaht") ?? "").trim();
    const priceSatang =
      priceRaw === ""
        ? null
        : Math.round(Number(priceRaw) * 100);
    await new CreateStampTypeUseCase(
      container.shopRepository,
      container.loyaltyStampTypeRepository,
    ).execute({
      shopId,
      name: String(formData.get("name") ?? ""),
      threshold: Number(formData.get("threshold") ?? 10),
      rewardText: String(formData.get("rewardText") ?? ""),
      priceSatang:
        priceSatang != null && Number.isFinite(priceSatang) ? priceSatang : null,
    });
    revalidateLoyalty();
    return { success: "เพิ่มประเภทแสตมป์แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateStampTypeAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await requireShopWrite();
    const typeId = String(formData.get("typeId") ?? "");
    await new UpdateStampTypeUseCase(
      container.shopRepository,
      container.loyaltyStampTypeRepository,
    ).execute(shopId, typeId, {
      name: String(formData.get("name") ?? ""),
      threshold: Number(formData.get("threshold") ?? 10),
      rewardText: String(formData.get("rewardText") ?? ""),
    });
    revalidateLoyalty();
    return { success: "อัปเดตประเภทแสตมป์แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setStampTypeActiveAction(
  typeId: string,
  isActive: boolean,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await requireShopWrite();
    await new SetStampTypeActiveUseCase(
      container.shopRepository,
      container.loyaltyStampTypeRepository,
    ).execute(shopId, typeId, isActive);
    revalidateLoyalty();
    return { success: isActive ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function lookupStampCardAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await operatorContext();
    const phone = String(formData.get("phone") ?? "");
    const card = await new GetCustomerStampCardUseCase(
      container.shopRepository,
      container.customerRepository,
      container.loyaltyStampTypeRepository,
      container.loyaltyStampCardRepository,
      container.loyaltyStampBalanceRepository,
    ).execute(shopId, phone);
    if (!card) return { error: "ไม่พบบัตรแสตมป์ของลูกค้านี้" };
    return { card, success: "พบลูกค้า" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addStampsAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { actor, shopId } = await operatorContext();
    const card = await new AddStampsUseCase(
      container.shopRepository,
      container.customerRepository,
      container.loyaltyStampCardRepository,
      container.loyaltyStampTypeRepository,
      container.loyaltyStampBalanceRepository,
      container.loyaltyStampTransactionRepository,
    ).execute({
      shopId,
      phone: String(formData.get("phone") ?? ""),
      stampTypeId: String(formData.get("stampTypeId") ?? ""),
      quantity: Number(formData.get("quantity") ?? 1),
      performedBy: actor.id,
      displayName: String(formData.get("displayName") ?? "") || null,
    });
    revalidateLoyalty();
    return { card, success: "เพิ่มแสตมป์แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function redeemStampRewardAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { actor, shopId } = await operatorContext();
    const card = await new RedeemStampRewardUseCase(
      container.shopRepository,
      container.customerRepository,
      container.loyaltyStampCardRepository,
      container.loyaltyStampTypeRepository,
      container.loyaltyStampBalanceRepository,
      container.loyaltyStampTransactionRepository,
      container.loyaltyStampRedemptionRepository,
    ).execute({
      shopId,
      phone: String(formData.get("phone") ?? ""),
      stampTypeId: String(formData.get("stampTypeId") ?? ""),
      performedBy: actor.id,
    });
    revalidateLoyalty();
    return { card, success: "แลกรางวัลแสตมป์แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updatePointsSettingsAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await requireShopWrite();
    const bahtPerPoint = Number(formData.get("bahtPerPoint") ?? 100);
    const minRaw = String(formData.get("minRedeemPoints") ?? "").trim();
    await new UpdatePointsSettingsUseCase(
      container.shopRepository,
      container.loyaltyPointsSettingsRepository,
    ).execute(shopId, {
      satangPerPoint: Math.round(bahtPerPoint * 100),
      minRedeemPoints: minRaw === "" ? null : Number(minRaw),
    });
    revalidateLoyalty();
    return { success: "บันทึกอัตราแต้มแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function createPointsRewardAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await requireShopWrite();
    await new UpsertPointsRewardUseCase(
      container.shopRepository,
      container.loyaltyPointsRewardRepository,
    ).create(shopId, {
      name: String(formData.get("name") ?? ""),
      pointsCost: Number(formData.get("pointsCost") ?? 1),
      description: String(formData.get("description") ?? "") || null,
    });
    revalidateLoyalty();
    return { success: "เพิ่มรางวัลแต้มแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setPointsRewardActiveAction(
  rewardId: string,
  isActive: boolean,
): Promise<LoyaltyActionState> {
  try {
    const { shopId } = await requireShopWrite();
    await new UpsertPointsRewardUseCase(
      container.shopRepository,
      container.loyaltyPointsRewardRepository,
    ).setActive(shopId, rewardId, isActive);
    revalidateLoyalty();
    return { success: isActive ? "เปิดรางวัลแล้ว" : "ปิดรางวัลแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addPointsAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { actor, shopId } = await operatorContext();
    const bal = await new AddPointsUseCase(
      container.shopRepository,
      container.customerRepository,
      container.loyaltyPointsBalanceRepository,
      container.loyaltyPointsTransactionRepository,
    ).execute({
      shopId,
      phone: String(formData.get("phone") ?? ""),
      quantity: Number(formData.get("quantity") ?? 1),
      performedBy: actor.id,
      displayName: String(formData.get("displayName") ?? "") || null,
    });
    revalidateLoyalty();
    return { points: bal.currentPoints, success: "เพิ่มแต้มแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function redeemPointsRewardAction(
  _prev: LoyaltyActionState,
  formData: FormData,
): Promise<LoyaltyActionState> {
  try {
    const { actor, shopId } = await operatorContext();
    const bal = await new RedeemPointsRewardUseCase(
      container.shopRepository,
      container.customerRepository,
      container.loyaltyPointsSettingsRepository,
      container.loyaltyPointsBalanceRepository,
      container.loyaltyPointsTransactionRepository,
      container.loyaltyPointsRewardRepository,
    ).execute({
      shopId,
      phone: String(formData.get("phone") ?? ""),
      rewardId: String(formData.get("rewardId") ?? ""),
      performedBy: actor.id,
    });
    revalidateLoyalty();
    return { points: bal.currentPoints, success: "แลกรางวัลแต้มแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
