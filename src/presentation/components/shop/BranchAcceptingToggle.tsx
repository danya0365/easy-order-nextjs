"use client";

import { useState, useTransition } from "react";
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

  // Optimistic: flip immediately, revert on error (server refresh can be slow).
  const [on, setOn] = useState(acceptingOrders);
  const [seen, setSeen] = useState(acceptingOrders);
  if (seen !== acceptingOrders) {
    // Server value changed (refresh) → adopt it.
    setSeen(acceptingOrders);
    setOn(acceptingOrders);
  }

  function onChange(next: boolean) {
    setOn(next);
    start(async () => {
      const res = await setBranchAcceptingOrdersAction(branchId, next);
      if (res.error) {
        setOn(!next);
        toast.error(res.error);
      } else {
        toast.success(next ? t("acceptingNowOn") : t("acceptingNowOff"));
        router.refresh();
      }
    });
  }

  return (
    <ToggleSwitch
      checked={on}
      onChange={onChange}
      disabled={pending}
      testId="branch-accepting-toggle"
      label={on ? t("acceptingOn") : t("acceptingOff")}
      hint={on ? t("acceptingOnHint") : t("acceptingOffHint")}
    />
  );
}
