import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { AdminShopContactForm } from "@/src/presentation/components/admin/AdminShopContactForm";
import { ShopMenuOptionsToggle } from "@/src/presentation/components/admin/ShopMenuOptionsToggle";

export const dynamic = "force-dynamic";

/** Admin per-shop configuration hub: contact & payment (+ feature switches, demo data). */
export default async function AdminShopConfigPage({ params }: { params: Promise<{ shopId: string }> }) {
  await requireRole("platform_admin");
  const { shopId } = await params;
  const t = await getTranslations("adminConfig");
  const shop = await container.shopRepository.findById(shopId);
  if (!shop) notFound();
  const [profile, settings] = await Promise.all([
    container.shopProfileRepository.get(shopId),
    container.platformSettingsRepository.get(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/shops" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="size-4" /> {t("backToShops")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground">{t("shopTitle", { name: shop.name })}</h1>
        <Link href={`/s/${shop.slug}`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ExternalLink className="size-4" /> /s/{shop.slug}
        </Link>
        <Link href={`/admin/shops/${shop.id}/billing`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <Receipt className="size-4" /> {t("billingLink")}
        </Link>
      </div>
      <Card>
        <CardHeader title={t("contactTitle")} subtitle={t("contactSubtitle")} />
        <AdminShopContactForm
          shopId={shop.id}
          phone={profile?.phone ?? null}
          promptpayTarget={shop.promptpayTarget}
          lineUrl={profile?.lineUrl ?? null}
          facebookUrl={profile?.facebookUrl ?? null}
        />
      </Card>
      <Card>
        <CardHeader title={t("shopFeaturesTitle")} />
        <ShopMenuOptionsToggle
          shopId={shop.id}
          allowed={shop.menuOptionsAllowedByAdmin}
          platformEnabled={settings.menuOptionsEnabled}
        />
      </Card>
    </div>
  );
}
