"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  updateSettingsAction,
  type FormState,
} from "@/src/presentation/actions/shop-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

export function SettingsForm({
  name,
  promptpayTarget,
}: {
  name: string;
  promptpayTarget: string;
}) {
  const t = useTranslations("shop");
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateSettingsAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField label={t("setNameLabel")} htmlFor="name">
        <Input id="name" name="name" defaultValue={name} maxLength={80} required />
      </FormField>
      <FormField
        label={t("setPromptpayLabel")}
        htmlFor="promptpayTarget"
        hint={t("setPromptpayHint")}
      >
        <Input
          id="promptpayTarget"
          name="promptpayTarget"
          defaultValue={promptpayTarget}
          maxLength={30}
        />
      </FormField>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("setSaving") : t("setSave")}
      </Button>
    </form>
  );
}
