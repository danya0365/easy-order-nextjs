import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import { getOrderAccess } from "@/src/infrastructure/auth/order-access";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { loadOrderingExtras } from "@/src/application/use-cases/menu/MenuOptionUseCases";
import { Card } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { OrderQrGate } from "@/src/presentation/components/order/OrderQrGate";
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

  // Shop QR gate: ordering online requires having scanned THIS shop's order QR
  // (server-side check — the action re-verifies the cookie independently).
  const orderAccess = await getOrderAccess(slug);
  if (!orderAccess || orderAccess.shopId !== shop.id) {
    return (
      <OrderQrGate
        slug={slug}
        title={t("orderGateTitle")}
        description={t("orderGateDesc")}
        menuLabel={t("orderGateMenu")}
        bookLabel={t("orderGateBook")}
      />
    );
  }

  const sections = await new GetKioskMenuUseCase(
    container.menuCategoryRepository,
    container.menuItemRepository,
  ).execute(shop.id);

  // Delivery map: open on the shop's pinned branch, else Thailand overview.
  const branches = shop.deliveryEnabled
    ? await container.branchRepository.listByShop(shop.id)
    : [];
  const pinned = branches.find(
    (b) => b.latitude !== null && b.longitude !== null,
  );
  const mapCenter = pinned
    ? { lat: pinned.latitude as number, lng: pinned.longitude as number, zoom: 15 }
    : { lat: 13.7563, lng: 100.5018, zoom: 6 };

  // Remember the last pin for a bound member device of THIS shop.
  let lastDelivery = null;
  const memberToken = shop.deliveryEnabled ? await getMemberToken(slug) : null;
  if (memberToken) {
    const bound = await container.customerDeviceRepository.findByToken(memberToken);
    const c = bound?.customer;
    if (
      c &&
      c.shopId === shop.id &&
      c.lastDeliveryLat != null &&
      c.lastDeliveryLng != null
    ) {
      lastDelivery = {
        lat: c.lastDeliveryLat,
        lng: c.lastDeliveryLng,
        address: c.lastDeliveryAddress ?? null,
        landmark: c.lastDeliveryLandmark ?? null,
      };
    }
  }

  const extras = await loadOrderingExtras(
    container.platformSettingsRepository,
    container.menuOptionRepository,
    shop,
    sections.flatMap((sec) => sec.items.map((i) => i.id)),
  );

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
        mapCenter={mapCenter}
        lastDelivery={lastDelivery}
        optionGroups={extras.optionGroups}
        itemDetailEnabled={extras.itemDetailEnabled}
      />
    </main>
  );
}
