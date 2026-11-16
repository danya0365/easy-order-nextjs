"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Gift, Search } from "lucide-react";

import {
  findWheelRewardAction,
  redeemWheelRewardAction,
  type WheelRewardLookup,
} from "@/src/presentation/actions/wheel-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { useToast } from "@/src/presentation/components/ui/Toast";

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "";
}

/** Staff/owner counter tool: enter or scan-prefilled reward code → confirm. */
export function WheelRedeemStation({ initialCode = "", initialReward = null }: { initialCode?: string; initialReward?: WheelRewardLookup | null }) {
  const t = useTranslations("wheel");
  const toast = useToast();
  const [code, setCode] = useState(initialCode);
  const [reward, setReward] = useState<WheelRewardLookup | null>(initialReward);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function find() {
    start(async () => {
      setDone(false);
      const r = await findWheelRewardAction(code);
      if (r.error || !r.reward) {
        setReward(null);
        toast.error(r.error ?? t("redeemNotFound"));
      } else setReward(r.reward);
    });
  }

  function redeem() {
    if (!reward) return;
    start(async () => {
      const r = await redeemWheelRewardAction(reward.id);
      if (r.error) toast.error(r.error);
      else {
        setDone(true);
        setReward({ ...reward, rewardStatus: "redeemed", redeemedAt: new Date().toISOString() });
        toast.success(t("redeemDone"));
      }
    });
  }

  const canRedeem = reward && reward.rewardStatus === "pending" && !reward.expired && !done;

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          find();
        }}
      >
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("redeemCodePlaceholder")}
          className="font-mono tracking-widest"
          data-testid="wheel-redeem-code"
          autoCapitalize="characters"
        />
        <Button type="submit" loading={pending && !reward} data-testid="wheel-redeem-find">
          <Search className="size-4" />
          {t("redeemFind")}
        </Button>
      </form>

      {reward && (
        <div className="rounded-2xl border border-border bg-card p-4" data-testid="wheel-redeem-card">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Gift className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">{reward.prizeName}</p>
              <p className="text-xs text-muted">
                {t("customerLabel")}: {reward.customerName}
                {reward.phoneTail && ` · ***${reward.phoneTail}`}
              </p>
            </div>
            {reward.rewardStatus === "redeemed" ? (
              <Badge tone="success">{t("statusRedeemed")}</Badge>
            ) : reward.expired ? (
              <Badge tone="danger">{t("statusExpired")}</Badge>
            ) : (
              <Badge tone="warning">{t("statusPending")}</Badge>
            )}
          </div>
          <div className="mt-3 space-y-0.5 text-xs text-muted">
            <p className="font-mono">{reward.rewardCode}</p>
            <p>{t("wonAt", { date: fmt(reward.createdAt) })}</p>
            {reward.expiresAt && reward.rewardStatus !== "redeemed" && <p>{t("expiresAt", { date: fmt(reward.expiresAt) })}</p>}
            {reward.redeemedAt && <p>{t("redeemedAt", { date: fmt(reward.redeemedAt) })}</p>}
          </div>
          {canRedeem && (
            <Button fullWidth className="mt-4" loading={pending} onClick={redeem} data-testid="wheel-redeem-confirm">
              <CheckCircle2 className="size-4" />
              {t("redeemConfirm")}
            </Button>
          )}
          {done && (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-700" data-testid="wheel-redeem-done">
              <CheckCircle2 className="size-4" />
              {t("redeemDone")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
