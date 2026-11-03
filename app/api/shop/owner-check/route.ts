import { cookies } from "next/headers";

import { COOKIE_NAME } from "@/src/infrastructure/auth/session";
import { checkShopOwner } from "@/src/infrastructure/auth/owner-check";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/shop/owner-check?slug=… → { owner, href? }
 * Lightweight probe for the public shop header's "จัดการร้าน" shortcut. Called
 * client-side only when the eo_shop_hint cookie exists. No cookie → no DB hit.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !slug || slug.length > 100) {
    return Response.json({ owner: false }, { headers: NO_STORE });
  }
  try {
    return Response.json(await checkShopOwner(token, slug), { headers: NO_STORE });
  } catch {
    return Response.json({ owner: false }, { headers: NO_STORE });
  }
}
