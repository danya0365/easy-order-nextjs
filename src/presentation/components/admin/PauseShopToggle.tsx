"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  pauseShopAction,
  resumeShopAction,
} from "@/src/presentation/actions/admin-actions";
import { Button } from "@/src/presentation/components/ui/Button";

/** Admin control to pause / resume a shop (freezes billing days while paused). */
export function PauseShopToggle({
  shopId,
  paused,
}: {
  shopId: string;
  paused: boolean;
}) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () =>
          void (await (paused
            ? resumeShopAction(shopId)
            : pauseShopAction(shopId))),
        )
      }
    >
      {paused ? t("openShop") : t("pauseTemporarily")}
    </Button>
  );
}
