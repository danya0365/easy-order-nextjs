"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { LoyaltyStampType } from "@/src/domain/entities";
import {
  createStampTypeAction,
  setStampTypeActiveAction,
  type LoyaltyActionState,
} from "@/src/presentation/actions/loyalty-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function StampTypesManager({ types }: { types: LoyaltyStampType[] }) {
  const t = useTranslations("loyalty");
  const toast = useToast();
  const [state, action, pending] = useActionState<
    LoyaltyActionState,
    FormData
  >(createStampTypeAction, {});
  const [toggling, startToggle] = useTransition();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state, toast]);

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {types.map((type) => (
          <li
            key={type.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
          >
            <div>
              <p className="font-medium text-foreground">
                {type.name}
                {type.isDefault ? (
                  <span className="ml-2 text-xs text-muted">{t("defaultBadge")}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted">
                {type.threshold} {t("stampsUnit")} → {type.rewardText || "—"}
                {!type.isActive ? ` · ${t("inactive")}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={toggling}
              onClick={() =>
                startToggle(async () => {
                  const res = await setStampTypeActiveAction(
                    type.id,
                    !type.isActive,
                  );
                  if (res.error) toast.error(res.error);
                  else if (res.success) toast.success(res.success);
                })
              }
            >
              {type.isActive ? t("deactivate") : t("activate")}
            </Button>
          </li>
        ))}
      </ul>

      <form action={action} className="space-y-3 rounded-xl border border-border p-4">
        <p className="font-medium text-foreground">{t("addStampType")}</p>
        <Input name="name" placeholder={t("typeName")} required />
        <Input
          name="threshold"
          type="number"
          min={1}
          max={100}
          defaultValue={10}
          placeholder={t("threshold")}
          required
        />
        <Input name="rewardText" placeholder={t("rewardText")} />
        <Input name="priceBaht" type="number" min={0} step="0.01" placeholder={t("priceBahtOptional")} />
        <Button type="submit" loading={pending}>
          {t("createType")}
        </Button>
      </form>
    </div>
  );
}
