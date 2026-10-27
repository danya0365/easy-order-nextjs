"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { LoyaltyStampType } from "@/src/domain/entities";
import {
  addStampsAction,
  lookupStampCardAction,
  redeemStampRewardAction,
  type LoyaltyActionState,
} from "@/src/presentation/actions/loyalty-actions";
import { CardBalance } from "@/src/presentation/components/loyalty/CardBalance";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { useToast } from "@/src/presentation/components/ui/Toast";

export function StampStation({ types }: { types: LoyaltyStampType[] }) {
  const t = useTranslations("loyalty");
  const toast = useToast();
  const active = types.filter((x) => x.isActive);
  const [typeId, setTypeId] = useState(active[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [lookup, lookupAction, looking] = useActionState<
    LoyaltyActionState,
    FormData
  >(lookupStampCardAction, {});
  const [add, addAction, adding] = useActionState<
    LoyaltyActionState,
    FormData
  >(addStampsAction, {});
  const [redeem, redeemAction, redeeming] = useActionState<
    LoyaltyActionState,
    FormData
  >(redeemStampRewardAction, {});

  const card = add.card ?? redeem.card ?? lookup.card;

  useEffect(() => {
    for (const s of [lookup, add, redeem]) {
      if (s.error) toast.error(s.error);
      if (s.success) toast.success(s.success);
    }
  }, [lookup, add, redeem, toast]);

  if (active.length === 0) {
    return <p className="text-sm text-muted">{t("noActiveStampTypes")}</p>;
  }

  return (
    <div className="space-y-4">
      <form action={lookupAction} className="flex flex-wrap gap-2">
        <Input
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phonePlaceholder")}
          className="min-w-[10rem] flex-1"
          required
        />
        <Button type="submit" variant="outline" loading={looking}>
          {t("lookup")}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
        >
          {active.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} ({type.threshold})
            </option>
          ))}
        </select>
      </div>

      <form action={addAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="stampTypeId" value={typeId} />
        <Input
          name="quantity"
          type="number"
          min={1}
          max={50}
          defaultValue={1}
          className="w-24"
        />
        <Button type="submit" loading={adding} disabled={!phone || !typeId}>
          {t("addStamps")}
        </Button>
      </form>

      {card && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">
            {card.customer.displayName || card.customer.phone}
          </p>
          <CardBalance types={card.types} />
          {card.types
            .filter((p) => p.eligibleToRedeem)
            .map((p) => (
              <form key={p.type.id} action={redeemAction}>
                <input type="hidden" name="phone" value={card.customer.phone} />
                <input type="hidden" name="stampTypeId" value={p.type.id} />
                <Button type="submit" loading={redeeming} variant="outline">
                  {t("redeemStamp", { name: p.type.name })}
                </Button>
              </form>
            ))}
        </div>
      )}
    </div>
  );
}
