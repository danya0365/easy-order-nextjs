"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Megaphone } from "lucide-react";

import {
  updatePromotionsModuleAction,
  type PromotionsActionState,
} from "@/src/presentation/actions/promotions-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function PromotionsModuleForm({
  promotionsEnabled,
}: {
  promotionsEnabled: boolean;
}) {
  const t = useTranslations("promotions");
  const toast = useToast();
  const [state, action, pending] = useActionState<
    PromotionsActionState,
    FormData
  >(updatePromotionsModuleAction, {});

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
            name="promotionsEnabled"
            defaultChecked={promotionsEnabled}
            className="size-4 accent-brand-500"
          />
          <Megaphone className="size-4 text-muted" />
          {t("moduleEnabled")}
        </label>
        <Button type="submit" size="sm" loading={pending}>
          {t("save")}
        </Button>
      </form>
      <Link href="/shop/promotions" className="text-sm text-brand-600 underline">
        {t("manage")}
      </Link>
    </div>
  );
}
