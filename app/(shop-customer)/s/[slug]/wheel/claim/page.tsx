import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShoppingBag, Smartphone, Ticket } from "lucide-react";

import { shopBySlug } from "@/src/infrastructure/request/shop-lookups";
import { verifyWheelClaimToken } from "@/src/infrastructure/auth/order-access";
import { currentWheelMember } from "@/src/presentation/lib/lucky-wheel";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { ClaimReceiptButton } from "@/src/presentation/components/wheel/ClaimReceiptButton";

export const dynamic = "force-dynamic";

export default async function WheelClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ o?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { o = "", t: token = "" } = await searchParams;
  const shop = await shopBySlug(slug);
  if (!shop) notFound();
  const t = await getTranslations("wheel");
  if (!o || !token || !verifyWheelClaimToken(token, slug, shop.id, o)) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <EmptyState icon={<Ticket className="size-8" />} title={t("claimInvalid")} />
      </main>
    );
  }
  const member = await currentWheelMember(slug, shop.id);
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <Card>
        <CardHeader title={t("claimTitle")} subtitle={member ? t("claimDesc") : t("memberDesc")} />
        {member ? (
          <ClaimReceiptButton slug={slug} orderId={o} token={token} />
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href={`/s/${slug}/orders`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              <Smartphone className="size-4" />
              {t("memberCta")}
            </Link>
            <Link
              href={`/s/${slug}/order`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-on-brand"
            >
              <ShoppingBag className="size-4" />
              {t("orderCta")}
            </Link>
          </div>
        )}
      </Card>
    </main>
  );
}
