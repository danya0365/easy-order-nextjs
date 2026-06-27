import { notFound } from "next/navigation";
import { History, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { GetCustomerOrderHistoryUseCase } from "@/src/application/use-cases/member/GetCustomerOrderHistoryUseCase";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import type { OrderStatus } from "@/src/domain/entities";

export const dynamic = "force-dynamic";

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

export default async function CustomerHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bind?: string }>;
}) {
  const { slug } = await params;
  const { bind } = await searchParams;
  const t = await getTranslations("publicPages");
  const tOrder = await getTranslations("order");

  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) notFound();

  // Shop imagery (hero = cover, else profile; plus a small gallery row).
  const images = await container.shopImageRepository.listByShop(shop.id);
  const hero =
    images.find((i) => i.kind === "cover") ??
    images.find((i) => i.kind === "profile") ??
    null;
  const gallery = images.filter((i) => i.kind === "gallery");
  const heroBlock = (hero || gallery.length > 0) && (
    <div className="flex flex-col gap-2">
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element -- internal image route
        <img
          src={`/api/shop-images/${hero.id}`}
          alt={shop.name}
          className="aspect-video w-full rounded-2xl border border-border object-cover"
        />
      )}
      {gallery.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto">
          {gallery.map((img) => (
            <li key={img.id} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- internal image route */}
              <img
                src={`/api/shop-images/${img.id}`}
                alt=""
                className="size-20 rounded-lg border border-border object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const token = await getMemberToken(slug);
  const history = await new GetCustomerOrderHistoryUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
    container.orderRepository,
  ).execute(slug, token);

  // Not bound on this device (or token invalid): show the "scan at the shop" CTA.
  if (!history) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
        {heroBlock}
        <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
        {bind === "invalid" && (
          <Card>
            <p className="text-sm font-medium text-error">
              {t("bindInvalidTitle")}
            </p>
            <p className="mt-1 text-sm text-muted">{t("bindInvalidDesc")}</p>
          </Card>
        )}
        <EmptyState
          icon={<History />}
          title={t("notBoundTitle")}
          description={t("notBoundDesc")}
        />
      </main>
    );
  }

  const { customer, orders } = history;
  const who = customer.displayName || customer.phone;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      {heroBlock}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {t("myOrdersTitle")}
        </h1>
        <p className="text-sm text-muted">
          {t("myOrdersSubtitle", { shop: shop.name })} · {who}
        </p>
      </div>

      <Card>
        <CardHeader title={shop.name} />
        {orders.items.length === 0 ? (
          <EmptyState icon={<Store />} title={t("noOrdersYet")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {orders.items.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">#{o.orderNo}</p>
                  <p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {t("orderItemsSummary", {
                      count: o.items.length,
                      amount: satangToBaht(o.totalSatang),
                    })}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[o.status]}>
                  {tOrder(STATUS_KEY[o.status])}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
