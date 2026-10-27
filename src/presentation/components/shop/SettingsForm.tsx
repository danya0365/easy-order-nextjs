"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  updateSettingsAction,
  type FormState,
} from "@/src/presentation/actions/shop-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

export interface CategoryOption {
  id: string;
  name: string;
}

export function SettingsForm({
  name,
  categoryId,
  categories,
  promptpayTarget,
  onlineOrderingEnabled,
  pickupEnabled,
  deliveryEnabled,
  deliveryFeeSatang,
  deliveryNotes,
  minOrderSatang,
}: {
  name: string;
  categoryId: string | null;
  categories: CategoryOption[];
  promptpayTarget: string;
  onlineOrderingEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeSatang: number;
  deliveryNotes: string | null;
  minOrderSatang: number | null;
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
      <FormField label={t("setCategoryLabel")} htmlFor="categoryId">
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={categoryId ?? ""}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-400 focus:outline-none"
        >
          <option value="">{t("setCategoryNone")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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

      <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border p-3">
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            name="onlineOrderingEnabled"
            defaultChecked={onlineOrderingEnabled}
            className="size-4 accent-[var(--color-brand-500)]"
          />
          {t("setOnlineOrderingLabel")}
        </label>
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            name="pickupEnabled"
            defaultChecked={pickupEnabled}
            className="size-4 accent-[var(--color-brand-500)]"
          />
          {t("setPickupLabel")}
        </label>
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            name="deliveryEnabled"
            defaultChecked={deliveryEnabled}
            className="size-4 accent-[var(--color-brand-500)]"
          />
          {t("setDeliveryLabel")}
        </label>
      </div>

      <FormField
        label={t("setDeliveryFeeLabel")}
        htmlFor="deliveryFeeBaht"
        hint={t("setDeliveryFeeHint")}
      >
        <Input
          id="deliveryFeeBaht"
          name="deliveryFeeBaht"
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          defaultValue={deliveryFeeSatang / 100}
        />
      </FormField>
      <FormField
        label={t("setDeliveryNotesLabel")}
        htmlFor="deliveryNotes"
      >
        <Textarea
          id="deliveryNotes"
          name="deliveryNotes"
          rows={2}
          maxLength={200}
          defaultValue={deliveryNotes ?? ""}
          placeholder={t("setDeliveryNotesPlaceholder")}
        />
      </FormField>
      <FormField
        label={t("setMinOrderLabel")}
        htmlFor="minOrderBaht"
        hint={t("setMinOrderHint")}
      >
        <Input
          id="minOrderBaht"
          name="minOrderBaht"
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          defaultValue={minOrderSatang === null ? "" : minOrderSatang / 100}
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
