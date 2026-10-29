import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, PauseCircle, Pencil, ShoppingBag, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { container } from "@/src/infrastructure/di/container";
import { getMemberToken } from "@/src/infrastructure/auth/member";
import { getOrderAccess } from "@/src/infrastructure/auth/order-access";
import { getSession } from "@/src/infrastructure/auth/session";
import { GetCustomerOrderHistoryUseCase } from "@/src/application/use-cases/member/GetCustomerOrderHistoryUseCase";
import { Card } from "@/src/presentation/components/ui/Card";
import { ShopHero } from "@/src/presentation/components/shop/ShopHero";
import { ShopGallery } from "@/src/presentation/components/shop/ShopGallery";
import {
  ShopImageEditButton,
  EditableShopGallery,
} from "@/src/presentation/components/shop/ShopImageEditor";
import { ShopDetails } from "@/src/presentation/components/shop/ShopDetails";
import { RecommendedMenu } from "@/src/presentation/components/shop/RecommendedMenu";
import { ShopReviewsSection } from "@/src/presentation/components/reviews/ShopReviewsSection";
import { CustomerLoyaltyPanel } from "@/src/presentation/components/loyalty/CustomerLoyaltyPanel";
import {
  isSpendPointsOn,
  isStampCardOn,
} from "@/src/domain/services/loyalty-gates";
import { GetCustomerStampCardUseCase } from "@/src/application/use-cases/loyalty/GetCustomerStampCardUseCase";
import { GetRecommendedMenuUseCase } from "@/src/application/use-cases/menu/GetRecommendedMenuUseCase";

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
      ? t("metaShopTitle", { name: shop.name })
      : t("metaShopNotFound"),
    // Per-shop manifest → an installed icon opens this shop's page.
    manifest: shop ? `/s/${slug}/site.webmanifest` : undefined,
  };
}

export default async function CustomerShopPage({
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

  // Temporarily-closed shops: show a notice but keep the page viewable.
  const subscription = await container.subscriptionRepository.findByShop(shop.id);
  const isPaused = !!subscription?.pausedAt;

  // Order history comes ONLY from a bound device (secret token cookie).
  const token = await getMemberToken(slug);
  const history = await new GetCustomerOrderHistoryUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
    container.orderRepository,
  ).execute(slug, token);

  // Shop presentation: imagery, category, profile, reviews, location.
  const images = await container.shopImageRepository.listByShop(shop.id);
  const coverImage = images.find((i) => i.kind === "cover") ?? null;
  const profileImage = images.find((i) => i.kind === "profile") ?? null;
  const gallery = images.filter((i) => i.kind === "gallery");

  const [reviewSummary, reviewsPage, myReview, category, profile, branches] =
    await Promise.all([
      container.shopReviewRepository.summary(shop.id),
      container.shopReviewRepository.pageByShop(shop.id),
      history
        ? container.shopReviewRepository.findByCustomer(shop.id, history.customer.id)
        : Promise.resolve(null),
      shop.categoryId
        ? container.shopCategoryRepository.findById(shop.categoryId)
        : Promise.resolve(null),
      container.shopProfileRepository.get(shop.id),
      container.branchRepository.listByShop(shop.id),
    ]);
  // Prefer a branch that has coordinates (for the navigate button).
  const primaryBranch =
    branches.find((b) => b.latitude !== null && b.longitude !== null) ??
    branches[0] ??
    null;

  // Owner viewing their OWN page → show inline image edit affordances. Writes
  // stay guarded server-side (uploadShopImageAction scopes to the session's own
  // shop), so this only gates the UI.
  const sessionUser = await getSession();
  const isOwner =
    sessionUser?.role === "shop_owner" && sessionUser.shopId === shop.id;

  // Shop QR gate: the "สั่งออนไลน์" CTA appears only after scanning the shop's
  // order QR (the claim cookie enables direct ordering).
  const hasOrderAccess = !!(await getOrderAccess(slug));

  const recommendedItems = await new GetRecommendedMenuUseCase(
    container.menuCategoryRepository,
    container.menuItemRepository,
  ).execute(shop.id);

  const showStamp = isStampCardOn(shop);
  const showPoints = isSpendPointsOn(shop);
  let stampView: Awaited<
    ReturnType<GetCustomerStampCardUseCase["byCustomerId"]>
  > = null;
  let pointsBalance: Awaited<
    ReturnType<typeof container.loyaltyPointsBalanceRepository.findByCustomer>
  > = null;
  let pointsRewards: Awaited<
    ReturnType<typeof container.loyaltyPointsRewardRepository.listByShop>
  > = [];
  if ((showStamp || showPoints) && history) {
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
      pointsBalance = await container.loyaltyPointsBalanceRepository.findByCustomer(
        shop.id,
        history.customer.id,
      );
      pointsRewards = await container.loyaltyPointsRewardRepository.listByShop(
        shop.id,
        { activeOnly: true },
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      {shop.onlineOrderingEnabled && hasOrderAccess && (
        <Link
          href={`/s/${slug}/order`}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3.5 text-base font-bold text-on-brand shadow-sm transition hover:bg-brand-600"
        >
          <ShoppingBag className="size-5" />
          {tOrder("onlineOrderCta")}
        </Link>
      )}

      {isPaused && (
        <p className="rounded-xl bg-warning-surface px-4 py-3 text-center text-sm text-warning">
          <PauseCircle className="mr-1 inline size-4 align-text-bottom" />
          {t("pausedNotice")}
        </p>
      )}

      {isOwner && (
        <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-center text-sm text-brand-700 ring-1 ring-brand-100">
          <Pencil className="mr-1 inline size-4 align-text-bottom" />
          {t("ownerViewNotice")}
        </p>
      )}

      <ShopHero
        coverImage={coverImage}
        profileImage={profileImage}
        shopName={shop.name}
        categoryName={category?.name ?? null}
        rating={reviewSummary}
        coverOverlay={
          isOwner ? (
            <ShopImageEditButton kind="cover" imageId={coverImage?.id} />
          ) : undefined
        }
        profileOverlay={
          isOwner ? (
            <ShopImageEditButton kind="profile" imageId={profileImage?.id} />
          ) : undefined
        }
      />

      {isOwner ? (
        <EditableShopGallery images={gallery} />
      ) : (
        <ShopGallery images={gallery} />
      )}

      <RecommendedMenu
        slug={slug}
        items={recommendedItems}
        hasOrderAccess={hasOrderAccess}
        onlineOrderingEnabled={shop.onlineOrderingEnabled}
      />

      {history ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{t("myOrdersTitle")}</p>
              <p className="text-sm text-muted">
                {t("myOrdersSubtitle", { shop: shop.name })} ·{" "}
                {history.customer.displayName || history.customer.phone}
              </p>
            </div>
            <History className="size-5 shrink-0 text-brand-600" />
          </div>
          <Link
            href={`/s/${slug}/orders`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-600"
          >
            {t("viewOrders")}
          </Link>
        </Card>
      ) : (
        <Card className="bg-brand-50 ring-brand-100">
          <p className="flex items-center gap-2 text-sm text-brand-700">
            <Smartphone className="size-5 shrink-0" />
            <span>
              <strong>{t("notBoundTitle")}</strong> {t("notBoundDesc")}
            </span>
          </p>
          <Link
            href={`/s/${slug}/orders${bind === "invalid" ? "?bind=invalid" : ""}`}
            className="mt-3 inline-flex text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            {t("viewOrders")}
          </Link>
        </Card>
      )}


      {(showStamp || showPoints) && (
        <CustomerLoyaltyPanel
          slug={slug}
          bound={!!history}
          stampView={stampView}
          pointsBalance={pointsBalance}
          pointsRewards={pointsRewards}
          showStamp={showStamp}
          showPoints={showPoints}
        />
      )}

      <ShopDetails profile={profile} branch={primaryBranch} />

      <ShopReviewsSection
        slug={slug}
        shopId={shop.id}
        summary={reviewSummary}
        initial={reviewsPage}
        myReview={myReview}
        canReview={!!history}
      />

      <div className="mt-auto flex justify-center gap-4 text-xs text-muted">
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
