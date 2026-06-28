"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  updateShopProfileAction,
  type FormState,
} from "@/src/presentation/actions/shop-actions";
import type { ShopProfile } from "@/src/domain/entities";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { useActionToast } from "@/src/presentation/hooks/useActionToast";

/**
 * Owner-managed public shop profile (about / hours / contacts) shown on
 * /s/[slug]. All fields optional; saved via updateShopProfileAction.
 */
export function ShopProfileForm({ profile }: { profile: ShopProfile | null }) {
  const t = useTranslations("shop");
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateShopProfileAction,
    {},
  );
  useActionToast(state);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField label={t("profAbout")} htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          placeholder={t("profAboutPlaceholder")}
          defaultValue={profile?.description ?? ""}
        />
      </FormField>

      <FormField label={t("profHours")} htmlFor="openingHours">
        <Textarea
          id="openingHours"
          name="openingHours"
          rows={2}
          maxLength={500}
          placeholder={t("profHoursPlaceholder")}
          defaultValue={profile?.openingHours ?? ""}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("profPhone")} htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            defaultValue={profile?.phone ?? ""}
          />
        </FormField>
        <FormField label={t("profLineUrl")} htmlFor="lineUrl">
          <Input
            id="lineUrl"
            name="lineUrl"
            placeholder="https://lin.ee/..."
            defaultValue={profile?.lineUrl ?? ""}
          />
        </FormField>
        <FormField label={t("profFacebook")} htmlFor="facebookUrl">
          <Input
            id="facebookUrl"
            name="facebookUrl"
            placeholder="https://facebook.com/..."
            defaultValue={profile?.facebookUrl ?? ""}
          />
        </FormField>
        <FormField label={t("profInstagram")} htmlFor="instagramUrl">
          <Input
            id="instagramUrl"
            name="instagramUrl"
            placeholder="https://instagram.com/..."
            defaultValue={profile?.instagramUrl ?? ""}
          />
        </FormField>
        <FormField label={t("profWebsite")} htmlFor="websiteUrl">
          <Input
            id="websiteUrl"
            name="websiteUrl"
            placeholder="https://..."
            defaultValue={profile?.websiteUrl ?? ""}
          />
        </FormField>
      </div>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" loading={pending}>
        {pending ? t("profSaving") : t("profSave")}
      </Button>
    </form>
  );
}
