"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Save, TriangleAlert } from "lucide-react";

import { updateWheelCampaignAction, type WheelFormState } from "@/src/presentation/actions/wheel-actions";
import type { SpinCampaign } from "@/src/domain/entities";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { ToggleSwitch } from "@/src/presentation/components/ui/ToggleSwitch";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function WheelCampaignForm({ campaign }: { campaign: SpinCampaign }) {
  const t = useTranslations("wheel");
  const toast = useToast();
  const [state, action, pending] = useActionState<WheelFormState, FormData>(updateWheelCampaignAction, {});
  const [active, setActive] = useState(campaign.isActive);
  const [monthly, setMonthly] = useState(campaign.monthlyFreeEnabled);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.success) toast.success(state.success);
  }, [state, toast]);

  return (
    <form action={action} className="flex flex-col gap-4" data-testid="wheel-campaign-form">
      <input type="hidden" name="isActive" value={active ? "on" : ""} />
      <input type="hidden" name="monthlyFreeEnabled" value={monthly ? "on" : ""} />
      <ToggleSwitch checked={active} onChange={setActive} label={t("fieldActive")} hint={t("fieldActiveHint")} testId="wheel-active" />
      <FormField label={t("fieldName")} htmlFor="wc-name">
        <Input id="wc-name" name="name" defaultValue={campaign.name} maxLength={80} required />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t("fieldMinOrder")} htmlFor="wc-min">
          <Input id="wc-min" name="minOrderBaht" type="number" min={0} step="1" defaultValue={campaign.minOrderSatang / 100} />
        </FormField>
        <FormField label={t("fieldTicketsPerOrder")} htmlFor="wc-tpo">
          <Input id="wc-tpo" name="ticketsPerOrder" type="number" min={1} max={10} defaultValue={campaign.ticketsPerOrder} />
        </FormField>
      </div>
      <ToggleSwitch checked={monthly} onChange={setMonthly} label={t("fieldMonthly")} hint={t("fieldMonthlyHint")} testId="wheel-monthly" />
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t("fieldMonthlyDays")} htmlFor="wc-days">
          <Input id="wc-days" name="monthlyWindowDays" type="number" min={1} max={31} defaultValue={campaign.monthlyWindowDays} />
        </FormField>
        <FormField label={t("fieldRewardExpiry")} htmlFor="wc-exp">
          <Input id="wc-exp" name="rewardExpiryDays" type="number" min={1} max={365} defaultValue={campaign.rewardExpiryDays} />
        </FormField>
      </div>
      <FormField label={t("fieldRules")} htmlFor="wc-rules">
        <Textarea id="wc-rules" name="rulesText" rows={3} maxLength={1000} defaultValue={campaign.rulesText ?? ""} />
      </FormField>
      <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800" data-testid="wheel-permit-note">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        {t("permitNote")}
      </p>
      <Button type="submit" loading={pending} data-testid="wheel-campaign-save">
        <Save className="size-4" />
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
