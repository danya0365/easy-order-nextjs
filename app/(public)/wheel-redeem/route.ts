import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/src/infrastructure/auth/session";
import { loginUrlFor } from "@/src/domain/services/safe-next";
import { normalizeRewardCode } from "@/src/domain/services/lucky-wheel";

export const dynamic = "force-dynamic";

/**
 * Target of the QR on a customer's lucky-wheel reward: sends the scanning
 * staff/owner to the right redeem screen (code prefilled), or to login.
 * Carries only the public reward code — redeeming still needs a staff session.
 */
export async function GET(req: NextRequest) {
  const code = normalizeRewardCode(req.nextUrl.searchParams.get("code") ?? "");
  const q = code ? `?code=${encodeURIComponent(code)}` : "";
  const user = await getSession();
  let path: string;
  if (user?.role === "branch_staff") path = `/staff/wheel/redeem${q}`;
  else if (user?.role === "shop_owner" || user?.role === "platform_admin") path = `/shop/wheel/redeem${q}`;
  else path = loginUrlFor(`/wheel-redeem${q}`);
  return NextResponse.redirect(new URL(path, req.nextUrl.origin), 303);
}
