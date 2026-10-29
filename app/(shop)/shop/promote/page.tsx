import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { PromoStudio } from "@/src/presentation/components/shop/promote/PromoStudio";
import type { PromoPageSeed } from "@/src/presentation/components/shop/promote/types";

export const dynamic = "force-dynamic";

export default async function ShopPromotePage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) return null;

  // Two QR options: the public shop page, and (when static join is on) the
  // shop's permanent join QR that lets customers sign up + order online.
  const baseUrl = await getBaseUrl();
  const publicUrl = `${baseUrl}/s/${shop.slug}`;
  const shopQrDataUrl = await renderQrDataUrl(publicUrl);
  const joinQrDataUrl = await (async () => {
    if (!shop.onlineOrderingEnabled) return null;
    const k = await container.shopRepository.getStaticJoinToken(shop.id);
    if (!k) return null;
    return renderQrDataUrl(
      `${baseUrl}/s/${shop.slug}/join?k=${encodeURIComponent(k)}`,
    );
  })();

  // Inline the profile image as a data URL so html-to-image can draw it onto a
  // canvas at export time without tainting it (the public image route sets no
  // CORS header).
  const profile = await container.shopImageRepository.findProfile(shopId);
  let profileImageDataUrl: string | null = null;
  if (profile) {
    const file = await container.slipStorage.read(profile.storageKey);
    if (file) {
      const base64 = Buffer.from(file.bytes).toString("base64");
      profileImageDataUrl = `data:${file.contentType};base64,${base64}`;
    }
  }

  const seed: PromoPageSeed = {
    shopName: shop.name,
    publicUrl,
    shopQrDataUrl,
    joinQrDataUrl,
    profileImageDataUrl,
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("promoteTitle")} subtitle={t("promoteSubtitle")} />
        <PromoStudio seed={seed} />
      </Card>
    </div>
  );
}
