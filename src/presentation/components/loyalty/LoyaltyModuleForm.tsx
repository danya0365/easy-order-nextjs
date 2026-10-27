"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Gift, Stamp, Coins } from "lucide-react";

import {
  updateLoyaltyModuleAction,
  type LoyaltyActionState,
} from "@/src/presentation/actions/loyalty-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function LoyaltyModuleForm({
  loyaltyEnabled,
  stampCardEnabled,
  spendPointsEnabled,
}: {
  loyaltyEnabled: boolean;
  stampCardEnabled: boolean;
  spendPointsEnabled: boolean;
}) {
  const t = useTranslations("loyalty");
  const toast = useToast();
  const [state, action, pending] = useActionState<
    LoyaltyActionState,
    FormData
  >(updateLoyaltyModuleAction, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state, toast]);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="loyaltyEnabled"
            defaultChecked={loyaltyEnabled}
            className="size-4 accent-brand-500"
          />
          {t("moduleEnabled")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="stampCardEnabled"
            defaultChecked={stampCardEnabled}
            className="size-4 accent-brand-500"
          />
          <Stamp className="size-4 text-muted" />
          {t("stampKind")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="spendPointsEnabled"
            defaultChecked={spendPointsEnabled}
            className="size-4 accent-brand-500"
          />
          <Coins className="size-4 text-muted" />
          {t("pointsKind")}
        </label>
        <Button type="submit" loading={pending}>
          {t("saveModule")}
        </Button>
      </form>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/shop/loyalty"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-card"
        >
          <Gift className="size-3.5" />
          {t("openStation")}
        </Link>
        <Link
          href="/shop/loyalty/stamps"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-card"
        >
          {t("manageStamps")}
        </Link>
        <Link
          href="/shop/loyalty/points"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-card"
        >
          {t("managePoints")}
        </Link>
      </div>
    </div>
  );
}
