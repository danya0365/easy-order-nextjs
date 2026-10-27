import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Smartphone, Store, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { GetCustomerOrderHistoryUseCase } from "@/src/application/use-cases/member/GetCustomerOrderHistoryUseCase";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { InstallHint } from "@/src/presentation/components/pwa/InstallHint";
import { satangToBaht } from "@/src/presentation/lib/money";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import type { OrderStatus } from "@/src/domain/entities";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await container.shopRepository.findBySlug(slug);
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
  searchParams: Promise<{ bind?: string }>;
}) {
  const { slug } = await params;
  const { bind } = await searchParams;
  const t = await getTranslations("publicPages");
  const tOrder = await getTranslations("order");

  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop) notFound();

  const token = await getMemberToken(slug);
  const history = await new GetCustomerOrderHistoryUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
    container.orderRepository,
  ).execute(slug, token);

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

      {history ? (
        <>
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
                    <Badge tone={STATUS_TONE[o.status]}>
                      {tOrder(STATUS_KEY[o.status])}
                    </Badge>
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
        <Card className="bg-brand-50 ring-brand-100">
          <p className="flex items-center gap-2 text-sm text-brand-700">
            <Smartphone className="size-5 shrink-0" />
            <span>
              <strong>{t("notBoundTitle")}</strong> {t("notBoundDesc")}
            </span>
          </p>
        </Card>
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
