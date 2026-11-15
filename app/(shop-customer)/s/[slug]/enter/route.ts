import { NextResponse } from "next/server";

import { container } from "@/src/infrastructure/di/container";
import {
  clearOrderBranchCookie,
  setOrderAccessCookie,
  setOrderBranchCookie,
  verifyBranchClaimToken,
  verifyClaimToken,
} from "@/src/infrastructure/auth/order-access";

// Shop QR gate: the customer scans the shop's order QR → this verifies the
// shop-bound signed token, sets the httpOnly order-access cookie for THAT
// shop only, and redirects to the online ordering page.
// Branch QR (`&b=<branchId>`): the token is bound to that branch too; the
// branch is remembered in its own signed cookie so the order goes to it.
// A plain shop QR clears any remembered branch (→ main branch).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const sp = new URL(request.url).searchParams;
  const token = sp.get("t") ?? "";
  const branchId = sp.get("b") ?? "";

  const shop = await container.shopRepository.findBySlug(slug);
  if (shop && branchId) {
    const branch = await container.branchRepository.findById(branchId);
    const valid =
      !!branch &&
      branch.shopId === shop.id &&
      verifyBranchClaimToken(token, slug, shop.id, branchId);
    if (valid) {
      await setOrderAccessCookie(slug, shop.id);
      await setOrderBranchCookie(slug, shop.id, branchId);
      return NextResponse.redirect(new URL(`/s/${slug}/order`, request.url));
    }
  } else if (shop && verifyClaimToken(token, slug, shop.id)) {
    await setOrderAccessCookie(slug, shop.id);
    await clearOrderBranchCookie(slug);
    return NextResponse.redirect(new URL(`/s/${slug}/order`, request.url));
  }

  return NextResponse.redirect(new URL(`/s/${slug}/order?access=denied`, request.url));
}
