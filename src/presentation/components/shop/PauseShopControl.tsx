"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  pauseMyShopAction,
  resumeMyShopAction,
} from "@/src/presentation/actions/shop-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";

/** Owner toggle to temporarily close / reopen the shop (freezes billing days). */
export function PauseShopControl({
  paused,
  daysUntilDue,
  frozenDaysSoFar = 0,
  pausesUsed = 0,
  pauseCap = 8,
  cooldownRemainingSec = 0,
}: {
  paused: boolean;
  /** Usable days left (active state). */
  daysUntilDue?: number;
  /** Whole days closed so far → what reopening now refunds. */
  frozenDaysSoFar?: number;
  /** Closures used in the current 30-day window. */
  pausesUsed?: number;
  /** Max closures per window. */
  pauseCap?: number;
  /** Seconds until the shop may pause again (0 = none). */
  cooldownRemainingSec?: number;
}) {
  const t = useTranslations("shop");
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  function resume() {
    start(async () => {
      const res = await resumeMyShopAction();
      if (res.error) toast.error(res.error);
      else toast.success(t("pauseReopened"));
    });
  }

  if (paused) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning">
          <p>{t("pausedTitle")}</p>
          <p className="mt-1 font-medium">
            {frozenDaysSoFar >= 1
              ? `${t("pauseFrozenInfo", { frozen: frozenDaysSoFar })}${
                  typeof daysUntilDue === "number"
                    ? t("pauseDaysRemainingParen", { days: daysUntilDue })
                    : ""
                }`
              : t("pauseUnderOneDay")}
          </p>
        </div>
        <Button loading={pending} onClick={resume}>
          {pending ? t("pauseReopening") : t("pauseReopenShop")}
        </Button>
      </div>
    );
  }

  const cooldownHrs = Math.ceil(cooldownRemainingSec / 3600);
  const capReached = pausesUsed >= pauseCap;
  const blocked = cooldownRemainingSec > 0 || capReached;
  const blockNote = capReached
    ? t("pauseCapReached", { cap: pauseCap })
    : cooldownRemainingSec > 0
      ? t("pauseCooldown", { hrs: cooldownHrs })
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 text-sm text-muted">
        <p>{t("pauseIntro")}</p>
        {typeof daysUntilDue === "number" && (
          <p className="font-medium text-foreground">
            {t("pauseUsage", { days: daysUntilDue, used: pausesUsed, cap: pauseCap })}
          </p>
        )}
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            {t.rich("pauseRuleWholeDays", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich("pauseRuleMax", {
              cap: pauseCap,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich("pauseRuleCooldown", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </li>
          <li>{t("pauseRuleWhilePaused")}</li>
        </ul>
      </div>

      {blockNote && (
        <p className="rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning">
          {blockNote}
        </p>
      )}

      <Button
        variant="outline"
        loading={pending}
        disabled={blocked}
        onClick={async () => {
          const ok = await confirm({
            title: t("pauseConfirmTitle"),
            message: t("pauseConfirmMessage"),
            confirmLabel: t("pauseConfirmLabel"),
            tone: "danger",
          });
          if (!ok) return;
          start(async () => {
            const res = await pauseMyShopAction();
            if (res.error) toast.error(res.error);
            else toast.success(t("shopPausedToast"));
          });
        }}
      >
        {pending ? t("pausing") : t("pauseShop")}
      </Button>
    </div>
  );
}
