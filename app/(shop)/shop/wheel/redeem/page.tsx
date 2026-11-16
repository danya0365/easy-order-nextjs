import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { findWheelRewardAction } from "@/src/presentation/actions/wheel-actions";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { WheelRedeemStation } from "@/src/presentation/components/wheel/WheelRedeemStation";

export const dynamic = "force-dynamic";

export default async function ShopWheelRedeemPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireShopAccess();
  const code = ((await searchParams).code ?? "").slice(0, 32);
  const t = await getTranslations("wheel");
  const found = code ? await findWheelRewardAction(code) : null;
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-24">
      <Link href="/shop/wheel" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
        <ArrowLeft className="size-4" />
        {t("backToWheel")}
      </Link>
      <Card>
        <CardHeader title={t("redeemTitle")} subtitle={t("redeemHint")} />
        <WheelRedeemStation initialCode={code} initialReward={found?.reward ?? null} />
      </Card>
    </main>
  );
}
