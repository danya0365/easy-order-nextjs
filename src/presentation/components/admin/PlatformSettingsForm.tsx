"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  updatePlatformSettingsAction,
  type AdminFormState,
} from "@/src/presentation/actions/admin-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

function Check({ name, checked, label, hint }: { name: string; checked: boolean; label: string; hint: string }) {
  return (
    <label className="flex items-start gap-3 text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        data-testid={name}
        defaultChecked={checked}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-500)]"
      />
      <span>
        {label}
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function PlatformSettingsForm({
  billingUiEnabled,
  shopSuspensionEnabled,
  dailyFeeBillingEnabled,
  dailyOrderThreshold,
  dailyFeeSatang,
  defaultCutoffTime,
}: {
  billingUiEnabled: boolean;
  shopSuspensionEnabled: boolean;
  dailyFeeBillingEnabled: boolean;
  dailyOrderThreshold: number;
  dailyFeeSatang: number;
  defaultCutoffTime: string;
}) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    updatePlatformSettingsAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <Check name="dailyFeeBillingEnabled" checked={dailyFeeBillingEnabled} label={t("settingsDailyFeeLabel")} hint={t("settingsDailyFeeHint")} />

      <FormField label={t("settingsDailyThresholdLabel")} htmlFor="dailyOrderThreshold">
        <Input id="dailyOrderThreshold" name="dailyOrderThreshold" type="number" inputMode="numeric" min={0} step="1" defaultValue={dailyOrderThreshold} />
      </FormField>

      <FormField label={t("settingsDailyFeeBahtLabel")} htmlFor="dailyFeeBaht">
        <Input id="dailyFeeBaht" name="dailyFeeBaht" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={dailyFeeSatang / 100} />
      </FormField>

      <FormField label={t("settingsCutoffLabel")} htmlFor="defaultCutoffTime">
        <Input id="defaultCutoffTime" name="defaultCutoffTime" type="time" defaultValue={defaultCutoffTime} />
      </FormField>
      <p className="-mt-2 text-xs text-muted">{t("settingsNextDayHint")}</p>

      <Check name="billingUiEnabled" checked={billingUiEnabled} label={t("settingsBillingUiLabel")} hint={t("settingsBillingUiHint")} />
      <Check name="shopSuspensionEnabled" checked={shopSuspensionEnabled} label={t("settingsSuspensionLabel")} hint={t("settingsSuspensionNagHint")} />

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("settingsSaving") : t("settingsSave")}
      </Button>
    </form>
  );
}
