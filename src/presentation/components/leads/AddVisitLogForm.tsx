"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  addLeadVisitLogAction,
  type LeadFormState,
} from "@/src/presentation/actions/lead-actions";
import type { LeadStatus } from "@/src/domain/entities";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import {
  LEAD_REACTION_KEY,
  LEAD_REACTION_ORDER,
  LEAD_STATUS_KEY,
  LEAD_STATUS_ORDER,
} from "@/src/presentation/lib/lead-display";

const SELECT_CLASS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export function AddVisitLogForm({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: LeadStatus;
}) {
  const t = useTranslations("leads");
  const [state, action, pending] = useActionState<LeadFormState, FormData>(
    addLeadVisitLogAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t("reaction")} htmlFor="reaction">
          <select id="reaction" name="reaction" className={SELECT_CLASS} required>
            {LEAD_REACTION_ORDER.map((r) => (
              <option key={r} value={r}>
                {t(LEAD_REACTION_KEY[r])}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("advanceTo")} htmlFor="advanceTo">
          <select id="advanceTo" name="advanceTo" className={SELECT_CLASS}>
            <option value="">{t("keepStatus")}</option>
            {LEAD_STATUS_ORDER.filter(
              (s) => s !== "won" && s !== "lost" && s !== currentStatus,
            ).map((s) => (
              <option key={s} value={s}>
                {t(LEAD_STATUS_KEY[s])}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label={t("noteLabel")} htmlFor="note">
        <Textarea
          id="note"
          name="note"
          rows={2}
          placeholder={t("notePlaceholder")}
        />
      </FormField>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("saving") : t("saveVisit")}
      </Button>
    </form>
  );
}
