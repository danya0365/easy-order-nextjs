import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { publicMenuUrl } from "@/src/domain/services/public-menu";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { MenuQrCardPanel } from "@/src/presentation/components/public-menu/MenuQrCardPanel";

export const dynamic = "force-dynamic";

/** Dedicated menu-QR print page (same panel as the Menu tab). */
export default async function ShopMenuQrPage() {
  const { shopId } = await requireShopAccess();
  const [t, shop, profile, baseUrl] = await Promise.all([
    getTranslations("qrHub"),
    container.shopRepository.findById(shopId),
    container.shopImageRepository.findProfile(shopId),
    getBaseUrl(),
  ]);
  if (!shop) return null;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/shop/qr" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-brand-700 print:hidden">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <MenuQrCardPanel
        seed={{
          shopName: shop.name,
          logoUrl: profile ? `/api/shop-images/${profile.id}` : null,
          normal: { url: publicMenuUrl(baseUrl, shop.slug) },
          book: { url: publicMenuUrl(baseUrl, shop.slug, "book") },
        }}
      />
    </div>
  );
}
