"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { setBranchStaffCanCancelAction } from "@/src/presentation/actions/branch-actions";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { ToggleSwitch } from "@/src/presentation/components/ui/ToggleSwitch";

/** Shop setting: may branch staff cancel orders of their own branch? */
export function BranchStaffCancelSwitch({
  enabled,
  platformEnabled,
}: {
  enabled: boolean;
  /** Admin master switch; when off the shop setting has no effect. */
  platformEnabled: boolean;
}) {
  const t = useTranslations("branch");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  // Optimistic: flip immediately, revert on error (server refresh can be slow).
  const [on, setOn] = useState(enabled);
  const [seen, setSeen] = useState(enabled);
  if (seen !== enabled) {
    // Server value changed (refresh) → adopt it.
    setSeen(enabled);
    setOn(enabled);
  }

  function onChange(next: boolean) {
    setOn(next);
    start(async () => {
      const res = await setBranchStaffCanCancelAction(next);
      if (res.error) {
        setOn(!next);
        toast.error(res.error);
      } else {
        toast.success(t("saved"));
        router.refresh();
      }
    });
  }

  return (
    <ToggleSwitch
      checked={on}
      onChange={onChange}
      disabled={pending}
      testId="branch-staff-cancel-switch"
      label={t("staffCancelLabel")}
      hint={platformEnabled ? t("staffCancelHint") : t("staffCancelPlatformOff")}
    />
  );
}
