"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  changeMyPasswordAction,
  type PasswordFormState,
} from "@/src/presentation/actions/auth-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(
    changeMyPasswordAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormField label={t("currentPassword")} htmlFor="currentPassword">
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      <FormField
        label={t("newPassword")}
        htmlFor="newPassword"
        hint={t("newPasswordHint")}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField label={t("confirmNewPassword")} htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("changePassword")}
      </Button>
    </form>
  );
}
