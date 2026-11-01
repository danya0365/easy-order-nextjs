"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { setShopMenuOptionsAllowedAction } from "@/src/presentation/actions/admin-shop-config-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function ShopMenuOptionsToggle({
  shopId,
  allowed: initial,
  platformEnabled,
}: {
  shopId: string;
  allowed: boolean;
  platformEnabled: boolean;
}) {
  const t = useTranslations("adminConfig");
  const toast = useToast();
  const [allowed, setAllowed] = useState(initial);
  const [pending, start] = useTransition();
  function toggle() {
    start(async () => {
      const res = await setShopMenuOptionsAllowedAction(shopId, !allowed);
      if (res.error) toast.error(res.error);
      else {
        setAllowed(!allowed);
        toast.success(t("saved"));
      }
    });
  }
  return (
    <div className="flex flex-col gap-2" data-testid="shop-menu-options-toggle">
      <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        <span>{t("shopMenuOptionsLabel")}</span>
        <Badge tone={allowed ? "success" : "neutral"}>{allowed ? t("on") : t("off")}</Badge>
        {allowed && platformEnabled && <Badge tone="success">{t("effectiveOn")}</Badge>}
      </div>
      {!platformEnabled && <p className="text-xs text-warning">{t("platformOffHint")}</p>}
      <p className="text-xs text-muted">{t("shopMenuOptionsHint")}</p>
      <Button size="sm" variant={allowed ? "outline" : "primary"} loading={pending} onClick={toggle}>
        {allowed ? t("disable") : t("enable")}
      </Button>
    </div>
  );
}
