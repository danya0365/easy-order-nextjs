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

export function PlatformSettingsForm({
  billingUiEnabled,
  orderThresholdBillingEnabled,
  orderThresholdCount,
  shopSuspensionEnabled,
}: {
  billingUiEnabled: boolean;
  orderThresholdBillingEnabled: boolean;
  orderThresholdCount: number;
  shopSuspensionEnabled: boolean;
}) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    updatePlatformSettingsAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          name="billingUiEnabled"
          defaultChecked={billingUiEnabled}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-500)]"
        />
        <span>
          {t("settingsBillingUiLabel")}
          <span className="block text-xs text-muted">
            {t("settingsBillingUiHint")}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          name="orderThresholdBillingEnabled"
          defaultChecked={orderThresholdBillingEnabled}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-500)]"
        />
        <span>
          {t("settingsThresholdLabel")}
          <span className="block text-xs text-muted">
            {t("settingsThresholdHint")}
          </span>
        </span>
      </label>

      <FormField label={t("settingsThresholdCountLabel")} htmlFor="orderThresholdCount">
        <Input
          id="orderThresholdCount"
          name="orderThresholdCount"
          type="number"
          inputMode="numeric"
          min={1}
          step="1"
          defaultValue={orderThresholdCount}
        />
      </FormField>

      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          name="shopSuspensionEnabled"
          defaultChecked={shopSuspensionEnabled}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-500)]"
        />
        <span>
          {t("settingsSuspensionLabel")}
          <span className="block text-xs text-muted">
            {t("settingsSuspensionHint")}
          </span>
        </span>
      </label>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("settingsSaving") : t("settingsSave")}
      </Button>
    </form>
  );
}

