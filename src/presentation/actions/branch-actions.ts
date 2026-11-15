"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import {
  operatorContext,
  requireShopWrite,
} from "@/src/infrastructure/auth/session";

/** Branch must belong to the acting shop (never trust a client branch id). */
async function ownedBranch(shopId: string, branchId: string) {
  const branch = await container.branchRepository.findById(branchId);
  if (!branch || branch.shopId !== shopId) throw new Error("ไม่พบสาขาในร้านนี้");
  return branch;
}

/** Owner: open/close one branch for new orders (temporary, keeps it listed). */
export async function setBranchAcceptingOrdersAction(
  branchId: string,
  acceptingOrders: boolean,
): Promise<{ error?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    await ownedBranch(shopId, branchId);
    await container.branchRepository.setAcceptingOrders(branchId, acceptingOrders);
    revalidatePath("/shop/branches");
    revalidatePath(`/shop/branches/${branchId}`);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Mark a shared menu item sold out (or back) at ONE branch. Owner for any of
 * the shop's branches; branch staff only for their own branch.
 */
export async function setBranchItemSoldOutAction(
  branchId: string,
  menuItemId: string,
  soldOut: boolean,
): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await operatorContext();
    await ownedBranch(shopId, branchId);
    if (actor.role === "branch_staff" && actor.branchId !== branchId) {
      throw new Error("แก้ได้เฉพาะสาขาของตัวเอง");
    }
    const item = await container.menuItemRepository.findById(menuItemId);
    if (!item || item.shopId !== shopId) throw new Error("ไม่พบเมนูในร้านนี้");
    await container.branchRepository.setItemSoldOut(branchId, menuItemId, soldOut);
    revalidatePath(`/shop/branches/${branchId}`);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Owner: allow/deny branch staff cancelling orders of their own branch. */
export async function setBranchStaffCanCancelAction(
  enabled: boolean,
): Promise<{ error?: string }> {
  try {
    const { shopId } = await requireShopWrite();
    await container.shopRepository.setBranchStaffCanCancel(shopId, enabled === true);
    revalidatePath("/shop/branches");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
