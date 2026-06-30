"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

import {
  exitKioskAction,
  type FormState,
} from "@/src/presentation/actions/kiosk-actions";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { Button } from "@/src/presentation/components/ui/Button";
import {
  KioskPinPad,
  KIOSK_PIN_MAX,
  KIOSK_PIN_MIN,
} from "@/src/presentation/components/kiosk/KioskPinPad";

export function KioskExitButton() {
  const t = useTranslations("kiosk");
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  // Track the pin that was last submitted so we can detect the "just errored" state
  // without needing setState-in-effect or ref-mutation-in-render.
  const [submittedPin, setSubmittedPin] = useState<string | null>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(
    exitKioskAction,
    {},
  );

  const isErrorState = !!state.error && submittedPin !== null && pin === submittedPin;

  function handleOpen() {
    setPin("");
    setSubmittedPin(null);
    setOpen(true);
  }

  function handleClose() {
    setPin("");
    setSubmittedPin(null);
    setOpen(false);
  }

  function handleDigit(d: string) {
    if (isErrorState) {
      setSubmittedPin(null);
      setPin(d);
      return;
    }
    setPin((prev) => (prev.length < KIOSK_PIN_MAX ? prev + d : prev));
  }

  function handleBackspace() {
    setSubmittedPin(null);
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-muted-surface hover:text-foreground"
      >
        <LogOut className="size-4" />
        {t("exit")}
      </button>

      <Modal open={open} onClose={handleClose} title={t("exitTitle")}>
        <form
          action={action}
          onSubmit={() => setSubmittedPin(pin)}
          className="flex flex-col items-center gap-5"
        >
          <p className="text-sm text-muted">{t("exitDesc")}</p>

          <KioskPinPad
            pin={pin}
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            isError={isErrorState}
          />

          {state.error && (
            <p className="text-sm text-error">{state.error}</p>
          )}

          <input type="hidden" name="pin" value={pin} />

          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={pin.length < KIOSK_PIN_MIN || pending}
              className="flex-1"
            >
              {pending ? t("exiting") : t("exitConfirm")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
