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

export function PlatformFeatureSwitchesForm({
  menuOptionsEnabled,
  itemDetailEnabled,
}: {
  menuOptionsEnabled: boolean;
  itemDetailEnabled: boolean;
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
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{t("saved")}</p>}
      <Button type="submit" disabled={pending} loading={pending}>{t("save")}</Button>
    </form>
  );
}
