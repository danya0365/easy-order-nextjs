"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  createBranchAction,
  type FormState,
} from "@/src/presentation/actions/shop-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";

export function AddBranchForm() {
  const t = useTranslations("shop");
  const [state, action, pending] = useActionState<FormState, FormData>(
    createBranchAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input name="name" placeholder={t("branchNamePlaceholder")} required />
        <Button type="submit" disabled={pending}>
          {t("branchAdd")}
        </Button>
      </div>
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
