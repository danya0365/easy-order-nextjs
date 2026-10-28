"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { setPromotionsAllowedAction } from "@/src/presentation/actions/promotions-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function PromotionsAllowToggle({
  shopId,
  allowed,
}: {
  shopId: string;
  allowed: boolean;
}) {
  const t = useTranslations("promotions");
  const [pending, start] = useTransition();
  const toast = useToast();

  function toggle() {
    start(async () => {
      const res = await setPromotionsAllowedAction(shopId, !allowed);
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
