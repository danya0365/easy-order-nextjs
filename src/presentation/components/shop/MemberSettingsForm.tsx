"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";

import {
  updateMemberSettingsAction,
  type MemberSettingsState,
} from "@/src/presentation/actions/customer-actions";
import type {
  MemberPolicy,
  MemberPolicyKey,
} from "@/src/domain/services/member-policy";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { useToast } from "@/src/presentation/components/ui/Toast";

const FIELDS: MemberPolicyKey[] = [
  "newMemberOrderCapThb",
  "newMemberMaxOpenOrders",
  "signupsPerDevicePerDay",
  "maxPendingRequests",
  "pendingExpiryHours",
  "rejectCooldownDays",
];

export function MemberSettingsForm({
  policy,
  defaults,
  bounds,
  memberOtpEnabled,
  memberSignupPaused,
}: {
  policy: MemberPolicy;
  defaults: MemberPolicy;
  bounds: Record<MemberPolicyKey, [number, number]>;
  memberOtpEnabled: boolean;
  memberSignupPaused: boolean;
}) {
  const t = useTranslations("shopPages");
  const toast = useToast();
  const [state, action, pending] = useActionState<MemberSettingsState, FormData>(
    updateMemberSettingsAction,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state, toast]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="memberSignupPaused"
          defaultChecked={memberSignupPaused}
          className="mt-1"
        />
        <span>
          <span className="font-medium">{t("memberSettingsPauseLabel")}</span>
          <span className="block text-sm text-muted">
            {t("memberSettingsPauseDesc")}
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="memberOtpEnabled"
          defaultChecked={memberOtpEnabled}
          className="mt-1"
        />
        <span>
          <span className="font-medium">{t("memberOtpEnabledLabel")}</span>
          <span className="block text-sm text-muted">
            {t("memberOtpEnabledDesc")} · {t("memberOtpCostNote")}
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((k) => {
          const [lo, hi] = bounds[k];
          const min = k === "newMemberOrderCapThb" ? 0 : lo;
          return (
            <FormField
              key={k}
              label={t(`memberPolicy_${k}`)}
              htmlFor={k}
              hint={t("memberPolicyHint", {
                min: k === "newMemberOrderCapThb" ? `${lo} (0 = ∞)` : lo,
                max: hi,
                def: defaults[k],
              })}
            >
              <Input
                id={k}
                name={k}
                type="number"
                inputMode="numeric"
                min={min}
                max={hi}
                step={1}
                required
                defaultValue={policy[k]}
              />
            </FormField>
          );
        })}
      </div>

      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? t("memberSettingsSaving") : t("memberSettingsSave")}
      </Button>
    </form>
  );
}
