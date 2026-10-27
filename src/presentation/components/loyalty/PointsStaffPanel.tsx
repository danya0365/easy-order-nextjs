"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { LoyaltyPointsReward } from "@/src/domain/entities";
import {
  addPointsAction,
  redeemPointsRewardAction,
  type LoyaltyActionState,
} from "@/src/presentation/actions/loyalty-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function PointsStaffPanel({
  rewards,
}: {
  rewards: LoyaltyPointsReward[];
}) {
  const t = useTranslations("loyalty");
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [add, addAction, adding] = useActionState<
    LoyaltyActionState,
    FormData
  >(addPointsAction, {});
  const [redeem, redeemAction, redeeming] = useActionState<
    LoyaltyActionState,
    FormData
  >(redeemPointsRewardAction, {});
  const activeRewards = rewards.filter((r) => r.isActive);

  useEffect(() => {
    for (const s of [add, redeem]) {
      if (s.error) toast.error(s.error);
      if (s.success) toast.success(s.success);
    }
  }, [add, redeem, toast]);

  const points = redeem.points ?? add.points;

  return (
    <div className="space-y-4">
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={t("phonePlaceholder")}
      />
      <form action={addAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="phone" value={phone} />
        <Input
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          className="w-24"
        />
        <Button type="submit" loading={adding} disabled={!phone}>
          {t("addPoints")}
        </Button>
      </form>
      {points != null && (
        <p className="text-sm text-muted">
          {t("currentPoints", { n: points })}
        </p>
      )}
      {activeRewards.length > 0 && (
        <ul className="space-y-2">
          {activeRewards.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
            >
              <div>
                <p className="font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted">
                  {t("pointsCost", { n: r.pointsCost })}
                </p>
              </div>
              <form action={redeemAction}>
                <input type="hidden" name="phone" value={phone} />
                <input type="hidden" name="rewardId" value={r.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  loading={redeeming}
                  disabled={!phone}
                >
                  {t("redeemPoints")}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
