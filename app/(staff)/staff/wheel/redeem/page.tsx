import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { findWheelRewardAction } from "@/src/presentation/actions/wheel-actions";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { WheelRedeemStation } from "@/src/presentation/components/wheel/WheelRedeemStation";

export const dynamic = "force-dynamic";

export default async function StaffWheelRedeemPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireRole("branch_staff");
  const code = ((await searchParams).code ?? "").slice(0, 32);
  const t = await getTranslations("wheel");
  const found = code ? await findWheelRewardAction(code) : null;
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <Card>
        <CardHeader title={t("redeemTitle")} subtitle={t("redeemHint")} />
        <WheelRedeemStation initialCode={code} initialReward={found?.reward ?? null} />
      </Card>
    </main>
  );
}
