"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createShopAction,
  type AdminFormState,
} from "@/src/presentation/actions/admin-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { GeneratedPasswordField } from "@/src/presentation/components/ui/GeneratedPasswordField";
import { ShopCredentialsHandoff } from "@/src/presentation/components/admin/ShopCredentialsHandoff";
import type { ShopHandoff } from "@/src/presentation/lib/shop-handoff";

export function CreateShopForm() {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    createShopAction,
    {},
  );
  // Dismissed-by-reference so the NEXT create still shows its own handoff.
  const [dismissed, setDismissed] = useState<ShopHandoff | null>(null);

  // After a successful create, show the credentials handoff above the form.
  if (state.handoff && state.handoff !== dismissed) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-success">{state.success}</p>
        <ShopCredentialsHandoff handoff={state.handoff} />
        <Button
          type="button"
          variant="outline"
          onClick={() => setDismissed(state.handoff ?? null)}
        >
          {t("csCreateAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t("csShopName")} htmlFor="name">
          <Input id="name" name="name" required />
        </FormField>
        <FormField label={t("csSlug")} htmlFor="slug">
          <Input id="slug" name="slug" placeholder="coffee-shop" required />
        </FormField>
        <FormField label={t("csOwnerEmail")} htmlFor="ownerEmail">
          <Input id="ownerEmail" name="ownerEmail" type="email" required />
        </FormField>
        <FormField label={t("csOwnerPassword")} htmlFor="ownerPassword">
          <GeneratedPasswordField />
        </FormField>
        <FormField label={t("csPricePerDay")} htmlFor="pricePerDayBaht">
          <Input
            id="pricePerDayBaht"
            name="pricePerDayBaht"
            type="number"
            min={1}
            step="0.5"
            defaultValue={10}
            required
          />
        </FormField>
        <FormField label={t("csPromptpay")} htmlFor="promptpayTarget">
          <Input id="promptpayTarget" name="promptpayTarget" maxLength={30} />
        </FormField>
      </div>
      <p className="text-xs text-muted">{t("csHint")}</p>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("csCreating") : t("csCreate")}
      </Button>
    </form>
  );
}
