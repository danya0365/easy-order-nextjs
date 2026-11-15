"use client";

import { useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { setBranchAcceptingOrdersAction } from "@/src/presentation/actions/branch-actions";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { cn } from "@/src/presentation/components/ui/cn";

/** Temporary open/closed-for-orders switch for ONE branch. */
export function BranchAcceptingToggle({
  branchId,
  acceptingOrders,
}: {
  branchId: string;
  acceptingOrders: boolean;
}) {
  const t = useTranslations("branch");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function onClick() {
    start(async () => {
      const res = await setBranchAcceptingOrdersAction(
        branchId,
        !acceptingOrders,
      );
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      data-testid="branch-accepting-toggle"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50",
        acceptingOrders
          ? "bg-success-surface text-success hover:opacity-80"
          : "bg-muted-surface text-muted hover:opacity-80",
      )}
    >
      {acceptingOrders ? (
        <Power className="size-4" />
      ) : (
        <PowerOff className="size-4" />
      )}
      {acceptingOrders ? t("acceptingOn") : t("acceptingOff")}
      <span className="text-muted">
        {acceptingOrders ? t("acceptingTurnOff") : t("acceptingTurnOn")}
      </span>
    </button>
  );
}
