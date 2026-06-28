"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  updateLeadAction,
  type LeadFormState,
} from "@/src/presentation/actions/lead-actions";
import type { Lead } from "@/src/domain/entities";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

const SELECT_CLASS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function LeadEditForm({
  lead,
  categories,
}: {
  lead: Lead;
  categories: { id: string; name: string }[];
}) {
  const t = useTranslations("leads");
  const [state, action, pending] = useActionState<LeadFormState, FormData>(
    updateLeadAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={lead.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t("shopName")} htmlFor="name">
          <Input id="name" name="name" defaultValue={lead.name} required />
        </FormField>
        <FormField label={t("phone")} htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            defaultValue={lead.phone ?? ""}
          />
        </FormField>
        <FormField label={t("category")} htmlFor="categoryId">
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={lead.categoryId ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">{t("categoryNone")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("nextFollowUp")} htmlFor="nextFollowUpAt">
          <Input
            id="nextFollowUpAt"
            name="nextFollowUpAt"
            type="date"
            defaultValue={lead.nextFollowUpAt?.slice(0, 10) ?? ""}
          />
        </FormField>
      </div>

      <FormField label={t("notes")} htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={lead.notes ?? ""}
        />
      </FormField>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
