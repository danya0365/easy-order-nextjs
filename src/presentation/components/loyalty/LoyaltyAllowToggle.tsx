"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { setLoyaltyAllowedAction } from "@/src/presentation/actions/loyalty-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function LoyaltyAllowToggle({
  shopId,
  allowed,
}: {
  shopId: string;
  allowed: boolean;
}) {
  const t = useTranslations("loyalty");
  const [pending, start] = useTransition();
  const toast = useToast();

  function toggle() {
    start(async () => {
      const res = await setLoyaltyAllowedAction(shopId, !allowed);
      if (res.error) toast.error(res.error);
      else if (res.success) toast.success(res.success);
    });
  }

  return (
    <Button
      size="sm"
      variant={allowed ? "outline" : "primary"}
      loading={pending}
      onClick={toggle}
    >
      {allowed ? t("adminRevoke") : t("adminAllow")}
    </Button>
  );
}
