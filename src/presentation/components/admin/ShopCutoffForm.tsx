"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  setShopBillingCutoffAction,
  type AdminFormState,
} from "@/src/presentation/actions/admin-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

export function ShopCutoffForm({ shopId, cutoff, platformDefault }: { shopId: string; cutoff: string | null; platformDefault: string }) {
  const t = useTranslations("dailyFee");
  const [state, action, pending] = useActionState<AdminFormState, FormData>(setShopBillingCutoffAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="shopId" value={shopId} />
      <FormField label={t("cutoffOverrideLabel", { def: platformDefault })} htmlFor="billingCutoffTime">
        <Input id="billingCutoffTime" name="billingCutoffTime" type="time" defaultValue={cutoff ?? ""} />
      </FormField>
      <p className="-mt-1 text-xs text-muted">{t("cutoffOverrideHint")}</p>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>{t("saveCutoff")}</Button>
    </form>
  );
}
