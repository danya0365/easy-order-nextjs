"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { redeemWheelRewardAction } from "@/src/presentation/actions/wheel-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { useToast } from "@/src/presentation/components/ui/Toast";

/** Confirm-redeem from a spin detail / customer detail page. */
export function RedeemRewardButton({ resultId, size }: { resultId: string; size?: "sm" | "md" }) {
  const t = useTranslations("wheel");
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size={size}
      loading={pending}
      data-testid="wheel-redeem-button"
      onClick={() => {
        if (!window.confirm(t("redeemConfirm") + "?")) return;
        start(async () => {
          const r = await redeemWheelRewardAction(resultId);
          if (r.error) toast.error(r.error);
          else {
            toast.success(t("redeemDone"));
            router.refresh();
          }
        });
      }}
    >
      <CheckCircle2 className="size-4" />
      {t("redeemOpen")}
    </Button>
  );
}
