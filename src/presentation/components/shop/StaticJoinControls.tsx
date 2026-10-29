"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, PauseCircle, PlayCircle } from "lucide-react";

import {
  rotateStaticJoinTokenAction,
  setMemberSignupPausedAction,
} from "@/src/presentation/actions/customer-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";

/** Rotate (revoke) the printed static QR + pause/resume new signups. */
export function StaticJoinControls({
  paused,
  showPause = true,
}: {
  paused: boolean;
  showPause?: boolean;
}) {
  const t = useTranslations("shopPages");
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  async function rotate() {
    const ok = await confirm({
      title: t("staticJoinRotateTitle"),
      message: t("staticJoinRotateWarning"),
      confirmLabel: t("staticJoinRotateConfirm"),
      tone: "danger",
    });
    if (!ok) return;
    start(async () => {
      const res = await rotateStaticJoinTokenAction();
      if (res.error) toast.error(res.error);
      else toast.success(res.message || t("staticJoinRotated"));
    });
  }

  function togglePause() {
    start(async () => {
      const res = await setMemberSignupPausedAction(!paused);
      if (res.error) toast.error(res.error);
      else toast.success(res.message || "OK");
    });
  }

  return (
    <div className="flex flex-col gap-3 print:hidden">
      {paused ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          {t("staticJoinPausedBanner")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {showPause ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={togglePause}
          >
            {paused ? (
              <PlayCircle className="size-4" />
            ) : (
              <PauseCircle className="size-4" />
            )}
            {paused ? t("staticJoinResume") : t("staticJoinPause")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={rotate}
        >
          <RefreshCw className="size-4" />
          {t("staticJoinRotate")}
        </Button>
      </div>
    </div>
  );
}
