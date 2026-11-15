"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  updatePlatformFeatureSwitchesAction,
  type AdminConfigState,
} from "@/src/presentation/actions/admin-shop-config-actions";
import { Button } from "@/src/presentation/components/ui/Button";

function Switch({ name, checked, label, hint }: { name: string; checked: boolean; label: string; hint: string }) {
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

function RiderAvailabilityRadio({ value, label, checked }: { value: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-start gap-3 text-sm text-foreground">
      <input
        type="radio"
        name="riderAvailabilityMode"
        value={value}
        defaultChecked={checked}
        data-testid={`riderAvailabilityMode-${value}`}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-500)]"
      />
      <span>{label}</span>
    </label>
  );
}

export function PlatformFeatureSwitchesForm({
  menuOptionsEnabled,
  itemDetailEnabled,
  riderAvailabilityMode,
  branchStaffQueueEnabled,
}: {
  menuOptionsEnabled: boolean;
  itemDetailEnabled: boolean;
  riderAvailabilityMode: "global" | "per_shop";
  branchStaffQueueEnabled: boolean;
}) {
  const t = useTranslations("adminConfig");
  const [state, action, pending] = useActionState<AdminConfigState, FormData>(
    updatePlatformFeatureSwitchesAction,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-4" data-testid="platform-feature-switches">
      <Switch name="menuOptionsEnabled" checked={menuOptionsEnabled} label={t("switchMenuOptions")} hint={t("switchMenuOptionsHint")} />
      <Switch name="itemDetailEnabled" checked={itemDetailEnabled} label={t("switchItemDetail")} hint={t("switchItemDetailHint")} />
      <Switch name="branchStaffQueueEnabled" checked={branchStaffQueueEnabled} label={t("switchBranchStaffQueue")} hint={t("switchBranchStaffQueueHint")} />
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-foreground">{t("riderAvailTitle")}</span>
        <RiderAvailabilityRadio value="global" label={t("riderAvailGlobal")} checked={riderAvailabilityMode !== "per_shop"} />
        <RiderAvailabilityRadio value="per_shop" label={t("riderAvailPerShop")} checked={riderAvailabilityMode === "per_shop"} />
        <span className="text-xs text-muted">{t("riderAvailHint")}</span>
      </div>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{t("saved")}</p>}
      <Button type="submit" disabled={pending} loading={pending}>{t("save")}</Button>
    </form>
  );
}
