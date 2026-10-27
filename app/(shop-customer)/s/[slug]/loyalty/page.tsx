import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { GetCustomerOrderHistoryUseCase } from "@/src/application/use-cases/member/GetCustomerOrderHistoryUseCase";
import { GetCustomerStampCardUseCase } from "@/src/application/use-cases/loyalty/GetCustomerStampCardUseCase";
import {
  isLoyaltyEffective,
  isSpendPointsOn,
  isStampCardOn,
} from "@/src/domain/services/loyalty-gates";
import { CustomerLoyaltyPanel } from "@/src/presentation/components/loyalty/CustomerLoyaltyPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await container.shopRepository.findBySlug(slug);
  const t = await getTranslations("loyalty");
  return {
    title: shop
      ? `${t("customerTitle")} · ${shop.name}`
      : t("customerTitle"),
    manifest: shop ? `/s/${slug}/site.webmanifest` : undefined,
  };
}

export default async function ShopCustomerLoyaltyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await container.shopRepository.findBySlug(slug);
  if (!shop || !isLoyaltyEffective(shop)) notFound();

  const showStamp = isStampCardOn(shop);
  const showPoints = isSpendPointsOn(shop);
  if (!showStamp && !showPoints) notFound();

  const token = await getMemberToken(slug);
  const history = await new GetCustomerOrderHistoryUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
    container.orderRepository,
  ).execute(slug, token);

  let stampView: Awaited<
    ReturnType<GetCustomerStampCardUseCase["byCustomerId"]>
  > = null;
  let pointsBalance: Awaited<
    ReturnType<typeof container.loyaltyPointsBalanceRepository.findByCustomer>
  > = null;
  // Rewards catalog is public for this shop when spend-points is on (incentive
  // even before bind). Balance still requires a bound member.
  let pointsRewards: Awaited<
    ReturnType<typeof container.loyaltyPointsRewardRepository.listByShop>
  > = [];

  if (showPoints) {
    pointsRewards = await container.loyaltyPointsRewardRepository.listByShop(
      shop.id,
      { activeOnly: true },
    );
  }

  if (history) {
    if (showStamp) {
      stampView = await new GetCustomerStampCardUseCase(
        container.shopRepository,
        container.customerRepository,
        container.loyaltyStampTypeRepository,
        container.loyaltyStampCardRepository,
        container.loyaltyStampBalanceRepository,
      ).byCustomerId(shop.id, history.customer.id);
    }
    if (showPoints) {
      pointsBalance =
        await container.loyaltyPointsBalanceRepository.findByCustomer(
          shop.id,
          history.customer.id,
        );
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <CustomerLoyaltyPanel
        slug={slug}
        bound={!!history}
        stampView={stampView}
        pointsBalance={pointsBalance}
        pointsRewards={pointsRewards}
        showStamp={showStamp}
        showPoints={showPoints}
      />
    </main>
  );
}
