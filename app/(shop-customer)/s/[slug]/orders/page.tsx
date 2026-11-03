import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, Phone, Smartphone, Store, TriangleAlert, CheckCircle2 } from "lucide-react";
import { riderFirstName } from "@/src/domain/services/rider";
import { customerDeliveryView } from "@/src/domain/services/rider-contact";
import { RiderAvatar } from "@/src/presentation/components/rider/RiderAvatar";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { GetMemberCardUseCase } from "@/src/application/use-cases/member/GetMemberCardUseCase";
import { MemberCard } from "@/src/presentation/components/member/MemberCard";
import { GetCustomerOrderHistoryUseCase } from "@/src/application/use-cases/member/GetCustomerOrderHistoryUseCase";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { InstallHint } from "@/src/presentation/components/pwa/InstallHint";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import type { OrderStatus } from "@/src/domain/entities";
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
  return {
    title: shop
      ? t("myOrdersTitle") + ` · ${shop.name}`
      : t("metaShopNotFound"),
    manifest: shop ? `/s/${slug}/site.webmanifest` : undefined,
  };
}

const STATUS_TONE: Record<OrderStatus, "neutral" | "warning" | "success"> = {
  pending: "warning",
  preparing: "warning",
  ready: "success",
  completed: "neutral",
  cancelled: "neutral",
};

const STATUS_KEY = {
  pending: "statusPending",
  preparing: "statusPreparing",
  ready: "statusReady",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
} as const;

export default async function ShopCustomerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bind?: string; unlinked?: string }>;
}) {
  const { slug } = await params;
  const { bind, unlinked } = await searchParams;
  const t = await getTranslations("publicPages");
  const tOrder = await getTranslations("order");
  const tRider = await getTranslations("rider");

  const shop = await shopBySlug(slug);
  if (!shop) notFound();

  const token = await getMemberToken(slug);
  const history = await new GetCustomerOrderHistoryUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
    container.orderRepository,
  ).execute(slug, token);
  const card = history
    ? await new GetMemberCardUseCase(
        container.customerCrmRepository,
        container.loyaltyPointsBalanceRepository,
      ).execute(shop, history.customer)
    : null;

  // Rider phase 1: show the assigned rider (first name + call) while en route.
  const riderIds = [
    ...new Set(
      (history?.orders.items ?? [])
        .filter((o) => customerDeliveryView(o) === "en_route")
        .map((o) => o.riderId as string),
    ),
  ];
  const riderById = new Map(
    (
      await Promise.all(riderIds.map((id) => container.riderRepository.findById(shop.id, id)))
    )
      .filter((r) => r !== null)
      .map((r) => [r.id, r]),
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">{t("myOrdersTitle")}</h1>
        <p className="text-sm text-muted">
          {t("myOrdersSubtitle", { shop: shop.name })}
          {history
            ? ` · ${history.customer.displayName || history.customer.phone}`
            : null}
        </p>
      </div>

      {history && card ? (
        <>
          <MemberCard slug={slug} card={card} />
          <Card>
            <CardHeader title={shop.name} />
            {history.orders.items.length === 0 ? (
              <EmptyState icon={<Store />} title={t("noOrdersYet")} />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {history.orders.items.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">#{o.orderNo}</p>
                      <p className="text-xs text-muted">
                        {formatDateTime(o.createdAt)}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {t("orderItemsSummary", {
                          count: o.items.length,
                          amount: satangToBaht(o.totalSatang),
                        })}
                      </p>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={STATUS_TONE[o.status]}>
                        {tOrder(STATUS_KEY[o.status])}
                      </Badge>
                      {(() => {
                        const view = customerDeliveryView(o);
                        if (view === "delivered") {
                          return (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success" data-testid="customer-delivered">
                              <CheckCircle2 className="size-3.5" /> {tRider("custDelivered")}
                            </span>
                          );
                        }
                        const rider = view === "en_route" && o.riderId ? riderById.get(o.riderId) : undefined;
                        if (!rider) return null;
                        return (
                          <span className="flex flex-col items-end gap-1 text-xs" data-testid="customer-rider">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700">
                              {rider.avatarUrl ? (
                                <RiderAvatar rider={{ id: rider.id, name: riderFirstName(rider.name), avatarUrl: rider.avatarUrl }} size={28} />
                              ) : (
                                <Bike className="size-3.5" />
                              )} {tRider("custEnRoute", { name: riderFirstName(rider.name) })}
                            </span>
                            <a
                              href={`tel:${rider.phone}`}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-foreground"
                            >
                              <Phone className="size-3.5" /> {tRider("custCall")}
                            </a>
                          </span>
                        );
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <details className="text-center">
            <summary className="cursor-pointer text-xs text-muted">
              {t("addToHomeOptional")}
            </summary>
            <div className="mt-2">
              <InstallHint />
            </div>
          </details>
        </>
      ) : bind === "invalid" ? (
        <EmptyState
          icon={<TriangleAlert />}
          title={t("bindInvalidTitle")}
          description={t("bindInvalidDesc")}
        />
      ) : (
        <>
        {unlinked ? (
          <p data-testid="member-unlinked" className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            {t("memberUnlinked")}
          </p>
        ) : null}
        <Card className="bg-brand-50 ring-brand-100">
          <p className="flex items-center gap-2 text-sm text-brand-700">
            <Smartphone className="size-5 shrink-0" />
            <span>
              <strong>{t("notBoundTitle")}</strong> {t("notBoundDesc")}
            </span>
          </p>
        </Card>
        </>
      )}

      <div className="mt-auto flex justify-center gap-4 text-xs text-muted">
        <Link href={`/s/${slug}`} className="hover:underline">
          {t("onlineOrderBackToShop")}
        </Link>
        <Link href="/privacy" className="hover:underline">
          {t("privacyPolicy")}
        </Link>
        <Link href="/tos" className="hover:underline">
          {t("termsOfService")}
        </Link>
      </div>
    </main>
  );
}
