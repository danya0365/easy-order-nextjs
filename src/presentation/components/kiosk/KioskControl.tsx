"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MonitorSmartphone, HandPlatter } from "lucide-react";

import {
  setKioskPinAction,
  activateKioskAction,
  setSelfServiceAction,
  type FormState,
} from "@/src/presentation/actions/kiosk-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { Input } from "@/src/presentation/components/ui/Input";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { cn } from "@/src/presentation/components/ui/cn";
import {
  KioskPinPad,
  KIOSK_PIN_MAX,
  KIOSK_PIN_MIN,
} from "@/src/presentation/components/kiosk/KioskPinPad";

export function KioskControl({
  hasKioskPin,
  selfService,
}: {
  hasKioskPin: boolean;
  selfService: boolean;
}) {
  const t = useTranslations("kiosk");
  const [pinState, pinAction, pinPending] = useActionState<FormState, FormData>(
    setKioskPinAction,
    {},
  );
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState<string | null>(null);
  const [actState, activate, actPending] = useActionState<FormState, FormData>(
    activateKioskAction,
    {},
  );
  const [selfOn, setSelfOn] = useState(selfService);
  const [selfPending, startSelf] = useTransition();

  const isPinErrorState = !!pinState.error && submittedPin !== null && pin === submittedPin;
  const isPinSuccessState = !!pinState.success && submittedPin !== null && pin === submittedPin;

  function handlePinDigit(d: string) {
    if (isPinErrorState || isPinSuccessState) {
      setSubmittedPin(null);
      setPin(d);
      return;
    }
    setPin((prev) => (prev.length < KIOSK_PIN_MAX ? prev + d : prev));
  }

  function handlePinBackspace() {
    setSubmittedPin(null);
    setPin((prev) => prev.slice(0, -1));
  }

  function toggleSelf() {
    const next = !selfOn;
    setSelfOn(next); // optimistic
    startSelf(async () => {
      const res = await setSelfServiceAction(next);
      if (res.error) setSelfOn(!next); // revert on failure
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Self-service mode */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <HandPlatter className="size-4" />
            {t("selfServiceLabel")}
          </h3>
          <p className="mt-1 text-sm text-muted">{t("selfServiceHint")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={selfOn}
          aria-label={t("selfServiceLabel")}
          onClick={toggleSelf}
          disabled={selfPending}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50",
            selfOn ? "bg-brand-500" : "bg-muted-surface",
          )}
        >
          <span
            className={cn(
              "inline-block size-5 rounded-full bg-card shadow transition",
              selfOn ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>

      {/* PIN */}
      <div className="border-t border-border pt-4">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t("kioskPinTitle")}
          </h3>
          <Badge tone={hasKioskPin ? "success" : "warning"}>
            {hasKioskPin ? t("kioskPinSet") : t("kioskPinNotSet")}
          </Badge>
        </div>
        <p className="mb-4 text-sm text-muted">{t("kioskPinHint")}</p>
        <form
          action={pinAction}
          onSubmit={() => setSubmittedPin(pin)}
          className="flex flex-col items-center gap-4"
        >
          <KioskPinPad
            pin={pin}
            onDigit={handlePinDigit}
            onBackspace={handlePinBackspace}
            isError={isPinErrorState}
          />
          <input type="hidden" name="pin" value={pin} />
          {pinState.error && <p className="text-sm text-error">{pinState.error}</p>}
          {pinState.success && <p className="text-sm text-success">{pinState.success}</p>}
          <Button type="submit" disabled={pin.length < KIOSK_PIN_MIN || pinPending} className="w-full">
            {pinPending ? t("kioskPinSaving") : t("kioskPinSave")}
          </Button>
        </form>
      </div>

      {/* Activate this device */}
      <div className="border-t border-border pt-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <MonitorSmartphone className="size-4" />
          {t("kioskActivateTitle")}
        </h3>
        <p className="mb-3 text-sm text-muted">{t("kioskActivateDesc")}</p>
        <form action={activate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField label={t("kioskLabelLabel")} htmlFor="kioskLabel">
            <Input
              id="kioskLabel"
              name="label"
              placeholder={t("kioskLabelPlaceholder")}
              maxLength={40}
              className="sm:w-64"
            />
          </FormField>
          <Button type="submit" disabled={!hasKioskPin || actPending}>
            {actPending ? t("kioskActivating") : t("kioskActivateButton")}
          </Button>
        </form>
        {!hasKioskPin && (
          <p className="mt-2 text-sm text-muted">{t("kioskNeedPinFirst")}</p>
        )}
        {actState.error && <p className="mt-2 text-sm text-error">{actState.error}</p>}
      </div>
    </div>
  );
}
