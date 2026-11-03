"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { adjustCreditAction, type CreditFormState } from "@/src/presentation/actions/credit-actions";
import { Button } from "@/src/presentation/components/ui/Button";

export function CreditAdjustForm({ shopId }: { shopId: string }) {
  const t = useTranslations("credit");
  const [state, action, pending] = useActionState<CreditFormState, FormData>(adjustCreditAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);
  const field = "rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground";
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3" data-testid="credit-adjust-form">
      <input type="hidden" name="shopId" value={shopId} />
      <div className="grid grid-cols-2 gap-2">
        <select name="kind" className={field} defaultValue="credit">
          <option value="credit">{t("kindCredit")}</option>
          <option value="bonus">{t("kindBonus")}</option>
          <option value="deduct">{t("kindDeduct")}</option>
        </select>
        <input name="amountBaht" type="number" min="0.01" step="0.01" required placeholder={t("amountBaht")} className={field} />
      </div>
      <input name="reason" required maxLength={300} placeholder={t("reasonRequired")} className={field} />
      {state.error && <p className="rounded-lg bg-error-surface px-3 py-2 text-sm text-error">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success">{state.success}</p>}
      <Button type="submit" loading={pending}>{t("save")}</Button>
    </form>
  );
}
