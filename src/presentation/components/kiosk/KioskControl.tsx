"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { MonitorSmartphone } from "lucide-react";

import {
  setKioskPinAction,
  activateKioskAction,
  type FormState,
} from "@/src/presentation/actions/kiosk-actions";
import { Input } from "@/src/presentation/components/ui/Input";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { Badge } from "@/src/presentation/components/ui/Badge";

export function KioskControl({ hasKioskPin }: { hasKioskPin: boolean }) {
  const t = useTranslations("kiosk");
  const [pinState, pinAction, pinPending] = useActionState<FormState, FormData>(
    setKioskPinAction,
    {},
  );
  const [actState, activate, actPending] = useActionState<FormState, FormData>(
    activateKioskAction,
    {},
  );

  return (
    <div className="flex flex-col gap-5">
      {/* PIN */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t("kioskPinTitle")}
          </h3>
          <Badge tone={hasKioskPin ? "success" : "warning"}>
            {hasKioskPin ? t("kioskPinSet") : t("kioskPinNotSet")}
          </Badge>
        </div>
        <form action={pinAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField label={t("kioskPinLabel")} htmlFor="kioskPin" hint={t("kioskPinHint")}>
            <Input
              id="kioskPin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="\d{4,6}"
              minLength={4}
              maxLength={6}
              required
            />
          </FormField>
          <Button type="submit" disabled={pinPending}>
            {pinPending ? t("kioskPinSaving") : t("kioskPinSave")}
          </Button>
        </form>
        {pinState.error && <p className="mt-2 text-sm text-error">{pinState.error}</p>}
        {pinState.success && (
          <p className="mt-2 text-sm text-success">{pinState.success}</p>
        )}
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
