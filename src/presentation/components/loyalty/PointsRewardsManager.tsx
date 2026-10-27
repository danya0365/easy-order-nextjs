"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { LoyaltyPointsReward, LoyaltyPointsSettings } from "@/src/domain/entities";
import {
  createPointsRewardAction,
  setPointsRewardActiveAction,
  updatePointsSettingsAction,
  type LoyaltyActionState,
} from "@/src/presentation/actions/loyalty-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function PointsRewardsManager({
  settings,
  rewards,
}: {
  settings: LoyaltyPointsSettings;
  rewards: LoyaltyPointsReward[];
}) {
  const t = useTranslations("loyalty");
  const toast = useToast();
  const [settingsState, settingsAction, settingsPending] = useActionState<
    LoyaltyActionState,
    FormData
  >(updatePointsSettingsAction, {});
  const [createState, createAction, createPending] = useActionState<
    LoyaltyActionState,
    FormData
  >(createPointsRewardAction, {});
  const [toggling, startToggle] = useTransition();

  useEffect(() => {
    for (const s of [settingsState, createState]) {
      if (s.error) toast.error(s.error);
      if (s.success) toast.success(s.success);
    }
  }, [settingsState, createState, toast]);

  return (
    <div className="space-y-6">
      <form
        action={settingsAction}
        className="space-y-3 rounded-xl border border-border p-4"
      >
        <p className="font-medium text-foreground">{t("pointsRateTitle")}</p>
        <p className="text-xs text-muted">{t("pointsRateHint")}</p>
        <Input
          name="bahtPerPoint"
          type="number"
          min={0.01}
          step="0.01"
          defaultValue={settings.satangPerPoint / 100}
          required
        />
        <Input
          name="minRedeemPoints"
          type="number"
          min={0}
          defaultValue={settings.minRedeemPoints ?? ""}
          placeholder={t("minRedeemOptional")}
        />
        <Button type="submit" loading={settingsPending}>
          {t("savePointsSettings")}
        </Button>
      </form>

      <ul className="space-y-2">
        {rewards.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
          >
            <div>
              <p className="font-medium text-foreground">{r.name}</p>
              <p className="text-xs text-muted">
                {t("pointsCost", { n: r.pointsCost })}
                {!r.isActive ? ` · ${t("inactive")}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={toggling}
              onClick={() =>
                startToggle(async () => {
                  const res = await setPointsRewardActiveAction(
                    r.id,
                    !r.isActive,
                  );
                  if (res.error) toast.error(res.error);
                  else if (res.success) toast.success(res.success);
                })
              }
            >
              {r.isActive ? t("deactivate") : t("activate")}
            </Button>
          </li>
        ))}
      </ul>

      <form
        action={createAction}
        className="space-y-3 rounded-xl border border-border p-4"
      >
        <p className="font-medium text-foreground">{t("addReward")}</p>
        <Input name="name" placeholder={t("rewardName")} required />
        <Input
          name="pointsCost"
          type="number"
          min={1}
          defaultValue={10}
          required
        />
        <Input name="description" placeholder={t("rewardDescription")} />
        <Button type="submit" loading={createPending}>
          {t("createReward")}
        </Button>
      </form>
    </div>
  );
}
