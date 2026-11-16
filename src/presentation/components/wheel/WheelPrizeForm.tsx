"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save, Trash2 } from "lucide-react";

import {
  deleteWheelPrizeAction,
  saveWheelPrizeAction,
  type WheelFormState,
} from "@/src/presentation/actions/wheel-actions";
import type { SpinPrize } from "@/src/domain/entities";
import { Button } from "@/src/presentation/components/ui/Button";
import { FormField } from "@/src/presentation/components/ui/FormField";
import { Input } from "@/src/presentation/components/ui/Input";
import { ToggleSwitch } from "@/src/presentation/components/ui/ToggleSwitch";
import { useToast } from "@/src/presentation/components/ui/Toast";

type Phase1Type = "points" | "free_item" | "gift" | "thanks";
const TYPES: { value: Phase1Type; key: "typePoints" | "typeFreeItem" | "typeGift" | "typeThanks" }[] = [
  { value: "gift", key: "typeGift" },
  { value: "free_item", key: "typeFreeItem" },
  { value: "points", key: "typePoints" },
  { value: "thanks", key: "typeThanks" },
];

const SELECT =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand-500 focus:outline-none";

export function WheelPrizeForm({
  prize,
  menuItems,
  pointsOn,
}: {
  prize: SpinPrize | null;
  menuItems: { id: string; name: string }[];
  pointsOn: boolean;
}) {
  const t = useTranslations("wheel");
  const toast = useToast();
  const router = useRouter();
  const [state, action, pending] = useActionState<WheelFormState & { id?: string }, FormData>(
    saveWheelPrizeAction.bind(null, prize?.id ?? null),
    {},
  );
  const initialType: Phase1Type =
    prize && (["points", "free_item", "gift", "thanks"] as string[]).includes(prize.type)
      ? (prize.type as Phase1Type)
      : "gift";
  const [type, setType] = useState<Phase1Type>(initialType);
  const [unlimited, setUnlimited] = useState(prize ? prize.stock === null : false);
  const [active, setActive] = useState(prize?.isActive ?? true);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.success) {
      toast.success(state.success);
      router.push("/shop/wheel");
    }
  }, [state, toast, router]);

  function onDelete() {
    if (!prize || !window.confirm(t("deleteConfirm"))) return;
    startDelete(async () => {
      const r = await deleteWheelPrizeAction(prize.id);
      if (r.error) toast.error(r.error);
      else {
        toast.success(r.result === "deactivated" ? t("deactivated") : t("deleted"));
        router.push("/shop/wheel");
      }
    });
  }

  return (
    <form action={action} className="flex flex-col gap-4" data-testid="wheel-prize-form">
      <input type="hidden" name="unlimitedStock" value={unlimited ? "on" : ""} />
      <input type="hidden" name="isActive" value={active ? "on" : ""} />
      <FormField label={t("fieldType")} htmlFor="wp-type" hint={t("couponPhase2")}>
        <select
          id="wp-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as Phase1Type)}
          className={SELECT}
        >
          {TYPES.filter((o) => o.value !== "points" || pointsOn || initialType === "points").map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.key)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={t("fieldPrizeName")} htmlFor="wp-name">
        <Input id="wp-name" name="name" defaultValue={prize?.name ?? ""} maxLength={40} required />
      </FormField>
      {type === "points" && (
        <FormField label={t("fieldPoints")} htmlFor="wp-points">
          <Input id="wp-points" name="pointsAmount" type="number" min={1} max={100000} defaultValue={prize?.pointsAmount ?? 10} required />
        </FormField>
      )}
      {type === "free_item" && (
        <FormField label={t("fieldMenuItem")} htmlFor="wp-menu">
          <select id="wp-menu" name="menuItemId" defaultValue={prize?.menuItemId ?? ""} className={SELECT} required>
            <option value="" disabled>
              —
            </option>
            {menuItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <FormField label={t("fieldWeight")} htmlFor="wp-weight" hint={t("fieldWeightHint")}>
        <Input id="wp-weight" name="weight" type="number" min={1} max={10000} defaultValue={prize?.weight ?? 10} required />
      </FormField>
      <ToggleSwitch checked={unlimited} onChange={setUnlimited} label={t("fieldUnlimited")} testId="wheel-prize-unlimited" />
      {!unlimited && (
        <FormField label={t("fieldStock")} htmlFor="wp-stock">
          <Input id="wp-stock" name="stock" type="number" min={0} max={1000000} defaultValue={prize?.stock ?? 10} required />
        </FormField>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t("fieldDailyCap")} htmlFor="wp-cap">
          <Input id="wp-cap" name="dailyCap" type="number" min={1} max={100000} defaultValue={prize?.dailyCap ?? ""} />
        </FormField>
        <FormField label={t("fieldCost")} htmlFor="wp-cost">
          <Input id="wp-cost" name="costBaht" type="number" min={0} step="0.01" defaultValue={prize ? prize.costSatang / 100 : 0} />
        </FormField>
      </div>
      <FormField label={t("fieldSort")} htmlFor="wp-sort">
        <Input id="wp-sort" name="sortOrder" type="number" min={0} max={999} defaultValue={prize?.sortOrder ?? 0} />
      </FormField>
      <ToggleSwitch checked={active} onChange={setActive} label={t("fieldPrizeActive")} testId="wheel-prize-active" />
      <Button type="submit" loading={pending} data-testid="wheel-prize-save">
        <Save className="size-4" />
        {pending ? t("saving") : t("save")}
      </Button>
      {prize && (
        <Button type="button" variant="danger" loading={deleting} onClick={onDelete} data-testid="wheel-prize-delete">
          <Trash2 className="size-4" />
          {t("deletePrize")}
        </Button>
      )}
    </form>
  );
}
