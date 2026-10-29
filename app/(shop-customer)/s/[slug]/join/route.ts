import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { ResolveStaticJoinGateUseCase } from "@/src/application/use-cases/member/ResolveStaticJoinGateUseCase";
import { setOrderAccessCookie } from "@/src/infrastructure/auth/order-access";
import { getMemberToken } from "@/src/infrastructure/auth/member";

/**
 * Static shop QR entry (`/s/[slug]/join`) — permanent URL, no expiring `t`.
 * Dynamic `/enter?t=` remains a separate flow and must stay untouched.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const memberToken = await getMemberToken(slug);
  const shop = await container.shopRepository.findBySlug(slug);

  const gate = await new ResolveStaticJoinGateUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
  ).execute(slug, memberToken);

  switch (gate.kind) {
    case "approved": {
      if (shop) await setOrderAccessCookie(slug, shop.id);
      return NextResponse.redirect(new URL(`/s/${slug}/order`, request.url));
    }
    case "pending":
      return NextResponse.redirect(
        new URL(`/s/${slug}/join/pending`, request.url),
      );
    case "rejected":
      return NextResponse.redirect(
        new URL(`/s/${slug}/join/rejected`, request.url),
      );
    case "needs_register":
      return NextResponse.redirect(
        new URL(`/s/${slug}/join/register`, request.url),
      );
    case "ordering_off": {
      const t = await getTranslations("shopPages");
      const html = `<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t("onlineOrderOffTitle")}</title>
<style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:2.5rem auto;padding:1.25rem;text-align:center}
.card{border:1px solid #e5e7eb;border-radius:.75rem;padding:2rem}.btn{display:inline-block;margin-top:1.25rem;padding:.6rem 1.1rem;background:#0d9488;color:#fff;text-decoration:none;border-radius:.5rem}</style>
</head><body><div class="card"><h2>${t("onlineOrderOffTitle")}</h2><p>${t("onlineOrderOffDesc")}</p>
<a class="btn" href="/s/${slug}">${t("onlineOrderBackToShop")}</a></div></body></html>`;
      return new NextResponse(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    case "not_found":
    default:
      return new NextResponse("ไม่พบร้านค้า", { status: 404 });
  }
}
