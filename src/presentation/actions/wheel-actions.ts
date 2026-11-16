"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { operatorContext, requireShopWrite } from "@/src/infrastructure/auth/session";
import { verifyWheelClaimToken } from "@/src/infrastructure/auth/order-access";
import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";
import { currentWheelMember, wheelService } from "@/src/presentation/lib/lucky-wheel";
import type { SpinPrizeType } from "@/src/domain/entities";

export type WheelFormState = { error?: string; success?: string };

function revalidateWheel() {
  revalidatePath("/shop/wheel");
}

function intField(fd: FormData, name: string, fallback: number): number {
  const raw = String(fd.get(name) ?? "").trim();
  if (raw === "") return fallback;
  return Number(raw);
}

function optIntField(fd: FormData, name: string): number | null {
  const raw = String(fd.get(name) ?? "").trim();
  return raw === "" ? null : Number(raw);
}

function bahtToSatang(fd: FormData, name: string): number {
  const raw = String(fd.get(name) ?? "").trim();
  if (raw === "") return 0;
  return Math.round(Number(raw) * 100);
}

/** Owner: campaign settings + shop on/off switch. */
export async function updateWheelCampaignAction(
  _prev: WheelFormState,
  fd: FormData,
): Promise<WheelFormState> {
  try {
    const { shopId } = await requireShopWrite();
    await wheelService().updateCampaign(shopId, {
      name: String(fd.get("name") ?? ""),
      isActive: fd.get("isActive") === "on",
      minOrderSatang: bahtToSatang(fd, "minOrderBaht"),
      ticketsPerOrder: intField(fd, "ticketsPerOrder", 1),
      monthlyFreeEnabled: fd.get("monthlyFreeEnabled") === "on",
      monthlyWindowDays: intField(fd, "monthlyWindowDays", 3),
      rewardExpiryDays: intField(fd, "rewardExpiryDays", 30),
      rulesText: String(fd.get("rulesText") ?? ""),
    });
    revalidateWheel();
    return { success: "บันทึกแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Owner: create (id = null) or update a prize. */
export async function saveWheelPrizeAction(
  id: string | null,
  _prev: WheelFormState,
  fd: FormData,
): Promise<WheelFormState & { id?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    const type = String(fd.get("type") ?? "") as SpinPrizeType;
    const menuItemId = String(fd.get("menuItemId") ?? "") || null;
    if (menuItemId) {
      const item = await container.menuItemRepository.findById(menuItemId);
      if (!item || item.shopId !== shopId) throw new Error("ไม่พบเมนูในร้านนี้");
    }
    const prize = await wheelService().savePrize(shopId, id, {
      type,
      name: String(fd.get("name") ?? ""),
      weight: intField(fd, "weight", 1),
      stock: fd.get("unlimitedStock") === "on" ? null : optIntField(fd, "stock") ?? 0,
      dailyCap: optIntField(fd, "dailyCap"),
      pointsAmount: optIntField(fd, "pointsAmount"),
      menuItemId,
      costSatang: bahtToSatang(fd, "costBaht"),
      isActive: fd.get("isActive") === "on",
      sortOrder: intField(fd, "sortOrder", 0),
    });
    revalidateWheel();
    return { success: "บันทึกรางวัลแล้ว", id: prize.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Owner: delete a never-won prize (else it is deactivated to keep history). */
export async function deleteWheelPrizeAction(id: string): Promise<{ error?: string; result?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    const r = await container.luckyWheelRepository.deletePrize(shopId, id);
    revalidateWheel();
    return { result: r };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Customer (remembered member device): spin once. */
export async function spinWheelAction(slug: string): Promise<{
  error?: string;
  prizeId?: string | null;
  prizeName?: string;
  prizeType?: "points" | "free_item" | "gift" | "thanks";
  resultId?: string;
  ticketsLeft?: number;
}> {
  try {
    if (typeof slug !== "string") throw new Error("ข้อมูลไม่ถูกต้อง");
    const shop = await shopBySlug(slug);
    if (!shop) throw new Error("ไม่พบร้าน");
    const member = await currentWheelMember(slug, shop.id);
    if (!member) throw new Error("ต้องเป็นสมาชิกร้านก่อนจึงจะหมุนได้");
    const out = await wheelService().spin(shop.id, member.id);
    const t = out.result.prizeType;
    revalidatePath(`/s/${slug}/wheel`);
    return {
      prizeId: out.result.prizeId,
      prizeName: out.result.prizeName,
      prizeType: t === "coupon_amount" || t === "coupon_percent" ? "thanks" : t,
      resultId: out.result.id,
      ticketsLeft: out.ticketsLeft,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Customer: claim the spin tickets printed as a QR on an anonymous kiosk receipt. */
export async function claimWheelReceiptAction(
  slug: string,
  orderId: string,
  token: string,
): Promise<{ error?: string; granted?: number }> {
  try {
    const shop = await shopBySlug(slug);
    if (!shop) throw new Error("ไม่พบร้าน");
    if (!verifyWheelClaimToken(String(token), slug, shop.id, String(orderId))) {
      throw new Error("QR นี้ไม่ถูกต้องหรือหมดอายุแล้ว");
    }
    const member = await currentWheelMember(slug, shop.id);
    if (!member) throw new Error("ต้องเป็นสมาชิกร้านก่อนจึงจะรับสิทธิ์ได้");
    const granted = await wheelService().claimKioskOrder(shop.id, String(orderId), member.id);
    revalidatePath(`/s/${slug}/wheel`);
    return { granted };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Owner or branch staff: redeem a won free-item / gift reward. */
export async function redeemWheelRewardAction(resultId: string): Promise<{ error?: string }> {
  try {
    const { actor, shopId, branchId } = await operatorContext();
    const r = await wheelService().redeem(shopId, String(resultId), actor, branchId);
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "wheel.reward_redeemed",
      targetType: "spin_result",
      targetId: r.id,
      shopId,
      metadata: { prize: r.prizeName, code: r.rewardCode, branchId },
    });
    revalidateWheel();
    revalidatePath("/staff/wheel");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface WheelRewardLookup {
  id: string;
  prizeName: string;
  prizeType: string;
  rewardCode: string | null;
  rewardStatus: string;
  expired: boolean;
  expiresAt: string | null;
  redeemedAt: string | null;
  createdAt: string;
  customerName: string;
  /** Last 4 digits only — enough for staff to confirm who is at the counter. */
  phoneTail: string;
}

/** Owner or branch staff: look up a reward by its code (or the scanned QR URL). */
export async function findWheelRewardAction(code: string): Promise<{ error?: string; reward?: WheelRewardLookup }> {
  try {
    const { shopId } = await operatorContext();
    const r = await wheelService().findRewardByCode(shopId, String(code ?? ""));
    if (!r) throw new Error("ไม่พบรางวัลจากโค้ดนี้");
    const c = await container.customerRepository.findById(shopId, r.customerId);
    return {
      reward: {
        id: r.id,
        prizeName: r.prizeName,
        prizeType: r.prizeType,
        rewardCode: r.rewardCode,
        rewardStatus: r.rewardStatus,
        expired: r.rewardStatus === "pending" && !!r.expiresAt && r.expiresAt < new Date().toISOString(),
        expiresAt: r.expiresAt,
        redeemedAt: r.redeemedAt,
        createdAt: r.createdAt,
        customerName: c?.displayName || "-",
        phoneTail: c?.phone ? c.phone.slice(-4) : "",
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
