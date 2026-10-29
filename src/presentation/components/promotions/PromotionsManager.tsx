"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { ShopPromotion } from "@/src/domain/entities";
import {
  createShopPromotionAction,
  updateShopPromotionAction,
  setShopPromotionActiveAction,
  deleteShopPromotionAction,
  type PromotionsActionState,
} from "@/src/presentation/actions/promotions-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { useToast } from "@/src/presentation/components/ui/Toast";

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Render as Bangkok wall time — `datetime-local` has no offset.
  return new Date(d.getTime() + 7 * 3600_000)
    .toISOString()
    .slice(0, 16);
}

export function PromotionsManager({
  promotions,
}: {
  promotions: ShopPromotion[];
}) {
  const t = useTranslations("promotions");
  const toast = useToast();
  const [createState, createAction, createPending] = useActionState<
    PromotionsActionState,
    FormData
  >(createShopPromotionAction, {});
  const [updateState, updateAction, updatePending] = useActionState<
    PromotionsActionState,
    FormData
  >(updateShopPromotionAction, {});
  const [toggling, startToggle] = useTransition();
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (createState.error) toast.error(createState.error);
    if (createState.success) toast.success(createState.success);
  }, [createState, toast]);
  useEffect(() => {
    if (updateState.error) toast.error(updateState.error);
    if (updateState.success) toast.success(updateState.success);
  }, [updateState, toast]);

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {promotions.map((promo) => (
          <li
            key={promo.id}
            className="rounded-xl border border-border bg-card p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">
                  {promo.title}
                  <span
                    className={
                      promo.isActive
                        ? "ml-2 text-xs text-brand-600"
                        : "ml-2 text-xs text-muted"
                    }
                  >
                    {promo.isActive ? t("active") : t("inactive")}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {promo.startsAt
                    ? isoToLocalInput(promo.startsAt).replace("T", " ")
                    : "∞"}
                  {" → "}
                  {promo.endsAt
                    ? isoToLocalInput(promo.endsAt).replace("T", " ")
                    : "∞"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={toggling}
                  onClick={() =>
                    startToggle(async () => {
                      const res = await setShopPromotionActiveAction(
                        promo.id,
                        !promo.isActive,
                      );
                      if (res.error) toast.error(res.error);
                      else if (res.success) toast.success(res.success);
                    })
                  }
                >
                  {promo.isActive ? t("deactivate") : t("activate")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={deleting}
                  onClick={() => {
                    if (!window.confirm(t("deleteConfirm"))) return;
                    startDelete(async () => {
                      const res = await deleteShopPromotionAction(promo.id);
                      if (res.error) toast.error(res.error);
                      else if (res.success) toast.success(res.success);
                    });
                  }}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
            <form action={updateAction} className="mt-3 space-y-2 border-t border-border pt-3">
              <input type="hidden" name="promotionId" value={promo.id} />
              <Input name="title" defaultValue={promo.title} required />
              <Textarea
                name="description"
                defaultValue={promo.description ?? ""}
                placeholder={t("description")}
                rows={2}
              />
              <Input
                name="imageUrl"
                defaultValue={promo.imageUrl ?? ""}
                placeholder="https://…"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={isoToLocalInput(promo.startsAt)}
                />
                <Input
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={isoToLocalInput(promo.endsAt)}
                />
              </div>
              <Input
                name="sortOrder"
                type="number"
                defaultValue={promo.sortOrder}
                placeholder={t("sortOrder")}
              />
              <Button type="submit" size="sm" variant="outline" loading={updatePending}>
                {t("save")}
              </Button>
            </form>
          </li>
        ))}
        {promotions.length === 0 && (
          <li className="text-sm text-muted">{t("empty")}</li>
        )}
      </ul>

      <form action={createAction} className="space-y-3 rounded-xl border border-border p-4">
        <p className="font-medium text-foreground">{t("create")}</p>
        <Input name="title" placeholder={t("title")} required />
        <Textarea name="description" placeholder={t("description")} rows={2} />
        <Input name="imageUrl" placeholder="https://…" />
        <div className="grid grid-cols-2 gap-2">
          <Input name="startsAt" type="datetime-local" />
          <Input name="endsAt" type="datetime-local" />
        </div>
        <Input name="sortOrder" type="number" defaultValue={0} placeholder={t("sortOrder")} />
        <Button type="submit" loading={createPending}>
          {t("create")}
        </Button>
      </form>
    </div>
  );
}
