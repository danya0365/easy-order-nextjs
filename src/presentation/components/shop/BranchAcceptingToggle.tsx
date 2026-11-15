"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { setBranchAcceptingOrdersAction } from "@/src/presentation/actions/branch-actions";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { ToggleSwitch } from "@/src/presentation/components/ui/ToggleSwitch";

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

  function onChange(next: boolean) {
    start(async () => {
      const res = await setBranchAcceptingOrdersAction(branchId, next);
      if (res.error) toast.error(res.error);
      else {
        toast.success(next ? t("acceptingNowOn") : t("acceptingNowOff"));
        router.refresh();
      }
    });
  }

  return (
    <ToggleSwitch
      checked={acceptingOrders}
      onChange={onChange}
      disabled={pending}
      testId="branch-accepting-toggle"
      label={acceptingOrders ? t("acceptingOn") : t("acceptingOff")}
      hint={acceptingOrders ? t("acceptingOnHint") : t("acceptingOffHint")}
    />
  );
}
