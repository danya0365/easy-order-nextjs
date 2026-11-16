import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import {
  getOrderAccess,
  getOrderBranchId,
} from "@/src/infrastructure/auth/order-access";
import {
  branchClosedReason,
  resolveOrderBranch,
} from "@/src/domain/services/branch-ordering";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { GetKioskMenuUseCase } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import { loadOrderingExtras } from "@/src/application/use-cases/menu/MenuOptionUseCases";
import { Card } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { OrderQrGate } from "@/src/presentation/components/order/OrderQrGate";
import { OnlineOrdering } from "@/src/presentation/components/order/OnlineOrdering";
import { wheelService } from "@/src/presentation/lib/lucky-wheel";
import {
  BranchSwitcher,
  type BranchChoice,
} from "@/src/presentation/components/order/BranchSwitcher";
import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await shopBySlug(slug);
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

  const shop = await shopBySlug(slug);
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
    // Prepaid credit wallet: block mode closes online ordering with a friendly message.
    const credit = await container.creditService.getStatus(shop.id).catch(() => null);
    if (credit?.enabled && !credit.gate.allowed) throw new Error("credit-blocked");
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

  // Branch taking this order: the branch QR this device scanned, else main.
  const branches = await container.branchRepository.listByShop(shop.id);
  const branch = resolveOrderBranch(
    branches,
    await getOrderBranchId(slug, shop.id),
  );
  const closed = branchClosedReason(branch);
  // Multi-branch: customer may switch among the shop's active branches; closed
  // ones are listed disabled with the reason (see selectOrderBranchAction).
  const tb = await getTranslations("branch");
  const choices: BranchChoice[] =
    branches.length > 1
      ? branches
          .filter((b) => b.isActive)
          .map((b) => ({
            id: b.id,
            name: b.name,
            address: b.address,
            closedReason: branchClosedReason(b),
          }))
      : [];
  const anyOpen = choices.some((c) => !c.closedReason);
  if (closed && anyOpen) {
    // Remembered/main branch is closed but others are open: no dead end.
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-28 pt-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
          <BranchSwitcher
            slug={slug}
            currentId={branch?.id ?? null}
            currentName={branch?.name ?? null}
            choices={choices}
            defaultOpen
          />
        </div>
        <div data-testid="order-branch-closed">
          <EmptyState
            icon={<Store className="size-10 text-muted" />}
            title={tb("currentClosedTitle")}
            description={tb("currentClosedDesc", { reason: closed })}
          />
        </div>
      </main>
    );
  }
  if (closed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
        <EmptyState
          icon={<ShoppingBag className="size-10 text-muted" />}
          title={t("onlineOrderClosedTitle")}
          description={closed}
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

  const [rawSections, branchSoldOut] = await Promise.all([
    new GetKioskMenuUseCase(
      container.menuCategoryRepository,
      container.menuItemRepository,
    ).execute(shop.id, { includeSoldOut: true }),
    branch
      ? container.branchRepository.listSoldOutItemIds(branch.id)
      : Promise.resolve([] as string[]),
  ]);
  // Per-branch sold-out override: shared menu, shown as sold out at THIS branch.
  const soldOut = new Set(branchSoldOut);
  const sections = soldOut.size
    ? rawSections.map((sec) => ({
        ...sec,
        items: sec.items.map((i) =>
          soldOut.has(i.id) ? { ...i, isAvailable: false } : i,
        ),
      }))
    : rawSections;

  // Delivery map: open on the ordering branch's pin (else any pinned branch,
  // else Thailand overview).
  const pinned =
    branch && branch.latitude !== null && branch.longitude !== null
      ? branch
      : branches.find((b) => b.latitude !== null && b.longitude !== null);
  const mapCenter = pinned
    ? { lat: pinned.latitude as number, lng: pinned.longitude as number, zoom: 15 }
    : { lat: 13.7563, lng: 100.5018, zoom: 6 };

  // Remember the last pin for a bound member device of THIS shop.
  // A remembered device (member cookie for THIS shop) also prefills the
  // order sheet's name + phone.
  let lastDelivery = null;
  let rememberedContact: { name: string; phone: string } | null = null;
  const memberToken = await getMemberToken(slug);
  if (memberToken) {
    const bound = await container.customerDeviceRepository.findByToken(memberToken);
    const c = bound?.customer;
    if (c && c.shopId === shop.id && !c.blockedAt) {
      rememberedContact = { name: c.displayName ?? "", phone: c.phone };
    }
    if (
      shop.deliveryEnabled &&
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

  const wheelOn = !!(await wheelService().gate(shop.id).catch(() => null))?.enabled;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
      {branch && choices.length > 1 && (
        <BranchSwitcher
          slug={slug}
          currentId={branch.id}
          currentName={branch.name}
          choices={choices}
        />
      )}
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
        rememberedContact={rememberedContact}
        customerLinkMode={shop.customerLinkMode}
        branchName={branch && choices.length > 1 ? branch.name : null}
        wheelEnabled={wheelOn}
      />
    </main>
  );
}
