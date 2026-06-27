"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  createStaffAction,
  type FormState,
} from "@/src/presentation/actions/shop-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

export function AddStaffForm({
  branches,
}: {
  branches: { id: string; name: string }[];
}) {
  const t = useTranslations("shop");
  const [state, action, pending] = useActionState<FormState, FormData>(
    createStaffAction,
    {},
  );

  if (branches.length === 0) {
    return <p className="text-sm text-muted">{t("staffNeedBranch")}</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormField label={t("staffBranch")} htmlFor="branchId">
        <select
          id="branchId"
          name="branchId"
          required
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={t("staffEmail")} htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </FormField>
      <FormField label={t("staffPassword")} htmlFor="password" hint={t("staffPasswordHint")}>
        <Input id="password" name="password" type="text" required />
      </FormField>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("staffAdding") : t("staffAdd")}
      </Button>
    </form>
  );
}
