"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { resumeMyShopAction } from "@/src/presentation/actions/shop-actions";
import { useToast } from "@/src/presentation/components/ui/Toast";

/** Owner control to reopen a paused shop. */
export function ResumeShopButton() {
  const t = useTranslations("billing");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await resumeMyShopAction();
          if (res.error) toast.error(res.error);
          else toast.success(t("shopReopened"));
        })
      }
      className="shrink-0 rounded-full bg-brand-500 px-3 py-1 text-sm font-medium text-on-brand transition hover:bg-brand-600 disabled:opacity-60"
    >
      {pending ? t("reopening") : t("reopenShop")}
    </button>
  );
}
