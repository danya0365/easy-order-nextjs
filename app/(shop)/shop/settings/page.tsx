import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { getBillingState } from "@/src/infrastructure/auth/billing-guard";
import { PAUSE_MAX_PER_30D } from "@/src/domain/services/subscription-status";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { SettingsForm } from "@/src/presentation/components/shop/SettingsForm";
import { ShopImagesManager } from "@/src/presentation/components/shop/ShopImagesManager";
import { KioskControl } from "@/src/presentation/components/kiosk/KioskControl";
import { PauseShopControl } from "@/src/presentation/components/shop/PauseShopControl";
import { ContactAdminButton } from "@/src/presentation/components/shop/ContactAdminButton";

export const dynamic = "force-dynamic";

export default async function ShopSettingsPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) return null;
  const [subscription, billing, pauseCapPeek, pauseCdPeek, categories, images] =
    await Promise.all([
      container.subscriptionRepository.findByShop(shop.id),
      getBillingState(shop.id),
      container.rateLimitRepository.peek(`shop_pause_cap:${shop.id}`),
      container.rateLimitRepository.peek(`shop_pause_cd:${shop.id}`),
      container.shopCategoryRepository.listActive(),
      container.shopImageRepository.listByShop(shop.id),
    ]);

  // Pause quota/cooldown snapshot for the UI (read-only — does not consume).
  const pausesUsed = pauseCapPeek?.count ?? 0;
  const cooldownRemainingSec = pauseCdPeek
    ? Math.max(
        0,
        Math.ceil(
          (new Date(pauseCdPeek.resetAt).getTime() - new Date().getTime()) /
            1000,
        ),
      )
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={t("shopDetailsTitle")}
          subtitle={t("shopDetailsSubtitle", { slug: shop.slug })}
        />
        <SettingsForm
          name={shop.name}
          categoryId={shop.categoryId}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          promptpayTarget={shop.promptpayTarget ?? ""}
        />
        <p className="mt-3 text-xs text-muted">{t("kioskPromptpayHint")}</p>
      </Card>

      <Card>
        <CardHeader
          title={t("shopImagesTitle")}
          subtitle={t("shopImagesSubtitle")}
        />
        <ShopImagesManager images={images} />
      </Card>

      <Card>
        <CardHeader title={t("kioskTitle")} subtitle={t("kioskSubtitle")} />
        <KioskControl hasKioskPin={shop.hasKioskPin} />
      </Card>

      <Card>
        <CardHeader
          title={t("pauseShopTitle")}
          subtitle={t("pauseShopSubtitle")}
        />
        <PauseShopControl
          paused={!!subscription?.pausedAt}
          daysUntilDue={billing.status.daysUntilDue}
          frozenDaysSoFar={billing.status.frozenDaysSoFar}
          pausesUsed={pausesUsed}
          pauseCap={PAUSE_MAX_PER_30D}
          cooldownRemainingSec={cooldownRemainingSec}
        />
      </Card>

      <Card>
        <CardHeader title={t("securityTitle")} subtitle={t("securitySubtitle")} />
        <Link
          href="/shop/security"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <ArrowRight className="size-4" />
          {t("openSecurity")}
        </Link>
      </Card>

      <Card>
        <CardHeader
          title={t("contactAdminTitle")}
          subtitle={t("contactAdminSubtitle")}
        />
        <ContactAdminButton />
      </Card>
    </div>
  );
}
