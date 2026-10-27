import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { Card } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { OnlineOrdering } from "@/src/presentation/components/order/OnlineOrdering";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await container.shopRepository.findBySlug(slug);
  const t = await getTranslations("publicPages");
  return { title: shop ? t("onlineOrderMetaTitle", { name: shop.name }) : t("metaShopNotFound") };
}

export default async function OnlineOrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("publicPages");

  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) notFound();

  if (!shop.onlineOrderingEnabled) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
        <EmptyState
          icon={<ShoppingBag className="size-10 text-muted" />}
          title={t("onlineOrderOffTitle")}
          description={t("onlineOrderOffDesc")}
        />
        <Card>
          <Link
            href={`/s/${slug}`}
            className="block rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-on-brand transition hover:bg-brand-600"
          >
            {t("onlineOrderBackToShop")}
          </Link>
        </Card>
      </main>
    );
  }

  try {
    await assertShopActive(shop.id);
  } catch {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
        <EmptyState
          icon={<ShoppingBag className="size-10 text-muted" />}
          title={t("onlineOrderClosedTitle")}
          description={t("onlineOrderClosedDesc")}
        />
        <Card>
          <Link
            href={`/s/${slug}`}
            className="block rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-on-brand transition hover:bg-brand-600"
          >
            {t("onlineOrderBackToShop")}
          </Link>
        </Card>
      </main>
    );
  }

  if (!shop.pickupEnabled && !shop.deliveryEnabled) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
        <EmptyState
          icon={<ShoppingBag className="size-10 text-muted" />}
          title={t("onlineOrderOffTitle")}
          description={t("onlineOrderOffDesc")}
        />
        <Card>
          <Link
            href={`/s/${slug}`}
            className="block rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-on-brand transition hover:bg-brand-600"
          >
            {t("onlineOrderBackToShop")}
          </Link>
        </Card>
      </main>
    );
  }

  const sections = await new GetKioskMenuUseCase(
    container.menuCategoryRepository,
    container.menuItemRepository,
  ).execute(shop.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
      <OnlineOrdering
        slug={slug}
        baseHref={`/s/${slug}`}
        sections={sections}
        hasPromptPay={!!shop.promptpayTarget}
        pickupEnabled={shop.pickupEnabled}
        deliveryEnabled={shop.deliveryEnabled}
        deliveryFeeSatang={shop.deliveryFeeSatang}
        deliveryNotes={shop.deliveryNotes}
        minOrderSatang={shop.minOrderSatang}
      />
    </main>
  );
}
