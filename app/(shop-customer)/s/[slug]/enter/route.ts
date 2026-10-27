import { NextResponse } from "next/server";

import { container } from "@/src/infrastructure/di/container";
import {
  setOrderAccessCookie,
  verifyClaimToken,
} from "@/src/infrastructure/auth/order-access";

// Shop QR gate: the customer scans the shop's order QR → this verifies the
// shop-bound signed token, sets the httpOnly order-access cookie for THAT
// shop only, and redirects to the online ordering page.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";

  const shop = await container.shopRepository.findBySlug(slug);
  const valid = shop ? verifyClaimToken(token, slug, shop.id) : false;

  if (valid && shop) {
    await setOrderAccessCookie(slug, shop.id);
    return NextResponse.redirect(new URL(`/s/${slug}/order`, request.url));
  }

  return NextResponse.redirect(new URL(`/s/${slug}/order?access=denied`, request.url));
}
