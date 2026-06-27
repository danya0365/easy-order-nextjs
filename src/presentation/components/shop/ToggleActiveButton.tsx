"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  toggleBranchAction,
  toggleStaffAction,
} from "@/src/presentation/actions/shop-actions";
import { cn } from "@/src/presentation/components/ui/cn";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";

export function ToggleActiveButton({
  kind,
  id,
  isActive,
}: {
  kind: "branch" | "staff";
  id: string;
  isActive: boolean;
}) {
  const t = useTranslations("shop");
  const [pending, start] = useTransition();
  const confirm = useConfirm();

  function apply() {
    start(async () => {
      if (kind === "branch") await toggleBranchAction(id, !isActive);
      else await toggleStaffAction(id, !isActive);
    });
  }

  async function onClick() {
    // Re-activating is safe; confirm only when turning something OFF.
    if (!isActive) return apply();
    const label = kind === "branch" ? t("tglBranchTarget") : t("tglStaffTarget");
    const ok = await confirm({
      title: t("tglConfirmTitle"),
      message: kind === "branch" ? t("tglBranchMsg") : t("tglStaffMsg"),
      confirmLabel: t("tglConfirmLabel", { target: label }),
      tone: "danger",
    });
    if (ok) apply();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50",
        isActive
          ? "bg-success-surface text-success hover:opacity-80"
          : "bg-muted-surface text-muted hover:opacity-80",
      )}
    >
      {isActive ? t("tglActive") : t("tglInactive")}
    </button>
  );
}
