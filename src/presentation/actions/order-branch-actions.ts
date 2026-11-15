"use server";

import { container } from "@/src/infrastructure/di/container";
import {
  requireOrderAccess,
  setOrderBranchCookie,
} from "@/src/infrastructure/auth/order-access";
import { branchClosedReason } from "@/src/domain/services/branch-ordering";
import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";

/**
 * Customer switches the branch their online order goes to.
 *
 * Security choice: the device must ALREADY hold a valid order-access cookie for
 * this shop (it scanned the shop's or any branch's QR — the existing QR gate).
 * Within that authorised shop, the customer may switch only among the shop's
 * own branches that are active AND accepting orders right now. The new branch
 * is stored in the same signed, short-lived branch cookie a branch QR sets.
 * Nothing here grants access to a shop the device hasn't scanned.
 */
export async function selectOrderBranchAction(
  slug: string,
  branchId: string,
): Promise<{ error?: string }> {
  try {
    if (typeof slug !== "string" || typeof branchId !== "string") {
      throw new Error("ข้อมูลไม่ถูกต้อง");
    }
    const shop = await shopBySlug(slug);
    if (!shop) throw new Error("ไม่พบร้าน");
    await requireOrderAccess(slug, shop.id);
    const branch = await container.branchRepository.findById(branchId);
    if (!branch || branch.shopId !== shop.id) throw new Error("ไม่พบสาขาในร้านนี้");
    const closed = branchClosedReason(branch);
    if (closed) throw new Error(closed);
    await setOrderBranchCookie(slug, shop.id, branch.id);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
