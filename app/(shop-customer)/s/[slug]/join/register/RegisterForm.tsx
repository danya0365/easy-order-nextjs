"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  registerStaticMemberAction,
  type RegisterStaticMemberState,
} from "@/src/presentation/actions/member/register-static-member-action";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { TurnstileWidget } from "@/src/presentation/components/auth/TurnstileWidget";

export function RegisterForm({
  slug,
  joinKey,
  memberOtpEnabled,
  turnstileSiteKey,
}: {
  slug: string;
  joinKey: string;
  memberOtpEnabled: boolean;
  turnstileSiteKey?: string;
}) {
  const t = useTranslations("shopPages");
  const [state, action, pending] = useActionState<
    RegisterStaticMemberState,
    FormData
  >(registerStaticMemberAction, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="k" value={joinKey} />
      <FormField label={t("displayName")} htmlFor="displayName">
        <Input
          id="displayName"
          name="displayName"
          required
          maxLength={80}
          autoComplete="name"
        />
      </FormField>
      <FormField label={t("phoneNumber")} htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          pattern="0[689][0-9]{8}"
          maxLength={10}
          placeholder="08xxxxxxxx"
          autoComplete="tel"
        />
      </FormField>
      {memberOtpEnabled ? (
        <FormField label={t("otpVerification")} htmlFor="otpCode">
          <Input id="otpCode" name="otpCode" inputMode="numeric" required />
        </FormField>
      ) : null}
      <TurnstileWidget siteKey={turnstileSiteKey} />
      {state.error ? (
        <p className="text-sm text-error">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : t("registerButton")}
      </Button>
    </form>
  );
}
