"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

import {
  exitKioskAction,
  type FormState,
} from "@/src/presentation/actions/kiosk-actions";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";

export function KioskExitButton() {
  const t = useTranslations("kiosk");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(
    exitKioskAction,
    {},
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-muted-surface hover:text-foreground"
      >
        <LogOut className="size-4" />
        {t("exit")}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("exitTitle")}>
        <form action={action} className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t("exitDesc")}</p>
          <FormField label={t("pinLabel")} htmlFor="exitPin">
            <Input
              id="exitPin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </FormField>
          {state.error && <p className="text-sm text-error">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? t("exiting") : t("exitConfirm")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
