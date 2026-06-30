"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Delete, LogOut } from "lucide-react";

import {
  exitKioskAction,
  type FormState,
} from "@/src/presentation/actions/kiosk-actions";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { Button } from "@/src/presentation/components/ui/Button";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const PIN_MAX = 6;
const PIN_MIN = 4;

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
    setPin((prev) => (prev.length < PIN_MAX ? prev + d : prev));
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

          <div className="flex gap-3">
            {Array.from({ length: PIN_MAX }, (_, i) => (
              <div
                key={i}
                className={`size-3.5 rounded-full border-2 transition-colors ${
                  i < pin.length
                    ? isErrorState
                      ? "border-error bg-error"
                      : "border-foreground bg-foreground"
                    : "border-muted"
                }`}
              />
            ))}
          </div>

          {state.error && (
            <p className="text-sm text-error">{state.error}</p>
          )}

          <input type="hidden" name="pin" value={pin} />

          <div className="grid w-full grid-cols-3 gap-2">
            {DIGITS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="flex h-16 items-center justify-center rounded-2xl bg-muted-surface text-2xl font-semibold text-foreground transition hover:bg-border active:scale-95"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleDigit("0")}
              className="flex h-16 items-center justify-center rounded-2xl bg-muted-surface text-2xl font-semibold text-foreground transition hover:bg-border active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="flex h-16 items-center justify-center rounded-2xl bg-muted-surface text-muted transition hover:bg-border active:scale-95"
            >
              <Delete className="size-6" />
            </button>
          </div>

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
              disabled={pin.length < PIN_MIN || pending}
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
