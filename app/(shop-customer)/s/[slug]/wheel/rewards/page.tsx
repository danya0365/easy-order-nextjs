import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight, FerrisWheel, Gift } from "lucide-react";

import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";
import { container } from "@/src/infrastructure/di/container";
import { currentWheelMember } from "@/src/presentation/lib/lucky-wheel";
import { formatDateTime } from "@/src/presentation/lib/format-date";
import { Pager, pageParam } from "@/src/presentation/components/credit/CreditBits";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { PrizeIcon } from "@/src/presentation/components/wheel/LuckyWheel";
import { RewardStatusBadge, wheelPrizeKind } from "@/src/presentation/components/wheel/RewardBits";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wheel");
  return { title: t("rewardsTitle") };
}

export default async function WheelRewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const shop = await shopBySlug(slug);
  if (!shop) notFound();
  const t = await getTranslations("wheel");
  const member = await currentWheelMember(slug, shop.id);
  const page = pageParam((await searchParams).page);
  const { items, total } = member
    ? await container.luckyWheelRepository.pageResults(shop.id, { customerId: member.id }, page, PAGE_SIZE)
    : { items: [], total: 0 };

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-bold text-foreground">{t("rewardsTitle")}</h1>
      {items.length === 0 ? (
        <EmptyState
          icon={<Gift className="size-8" />}
          title={member ? t("rewardsEmpty") : t("memberTitle")}
          action={
            <Link
              href={`/s/${slug}/wheel`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand"
            >
              <FerrisWheel className="size-4" />
              {t("goSpin")}
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card" data-testid="wheel-rewards-list">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/s/${slug}/wheel/rewards/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted-surface">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <PrizeIcon type={wheelPrizeKind(r.prizeType)} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{r.prizeName}</span>
                  <span className="block text-xs text-muted">{t("wonAt", { date: formatDateTime(r.createdAt) })}</span>
                </span>
                <RewardStatusBadge result={r} />
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager basePath={`/s/${slug}/wheel/rewards`} page={page} total={total} pageSize={PAGE_SIZE} />
      <Link href={`/s/${slug}/wheel`} className="text-center text-sm font-semibold text-brand-600">
        {t("goSpin")}
      </Link>
    </main>
  );
}
