"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, Copy, Link2, Pencil, Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Rider, RiderCommissionType } from "@/src/domain/entities";
import {
  RiderContactButtons,
  RiderStatusBadges,
} from "@/src/presentation/components/rider/RiderContact";
import { RiderAvatar } from "@/src/presentation/components/rider/RiderAvatar";

export type RiderRow = Rider & { openJobs: number };
import {
  regenerateRiderLinkAction,
  saveRiderAction,
} from "@/src/presentation/actions/rider-actions";
import { Card } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { Input } from "@/src/presentation/components/ui/Input";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { useToast } from "@/src/presentation/components/ui/Toast";

const TYPE_KEY = {
  per_trip: "typePerTrip",
  percent_fee: "typePercentFee",
  full_fee: "typeFullFee",
} as const;

interface FormState {
  id: string | null;
  name: string;
  phone: string;
  commissionType: RiderCommissionType;
  commissionValue: string;
  lineId: string;
  active: boolean;
}

const EMPTY: FormState = {
  id: null,
  name: "",
  phone: "",
  commissionType: "per_trip",
  commissionValue: "",
  lineId: "",
  active: true,
};

export function RidersManager({ riders }: { riders: RiderRow[] }) {
  const t = useTranslations("rider");
  const commissionText = (r: Rider): string =>
    r.commissionType === "per_trip"
      ? t("commissionPerTrip", { amount: (r.commissionValue / 100).toLocaleString("th-TH") })
      : r.commissionType === "percent_fee"
        ? t("commissionPercent", { value: r.commissionValue })
        : t("commissionFull");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [link, setLink] = useState<{ riderId: string; url: string } | null>(null);

  function edit(r: Rider) {
    setForm({
      id: r.id,
      name: r.name,
      phone: r.phone,
      commissionType: r.commissionType,
      commissionValue:
        r.commissionType === "per_trip" ? String(r.commissionValue / 100) : String(r.commissionValue),
      lineId: r.lineId ?? "",
      active: r.active,
    });
  }

  function save() {
    if (!form) return;
    start(async () => {
      const res = await saveRiderAction(form.id, {
        name: form.name,
        phone: form.phone,
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue) || 0,
        lineId: form.lineId,
        active: form.active,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success(t("saved"));
        setForm(null);
        router.refresh();
      }
    });
  }

  function regenerate(r: Rider) {
    if (r.hasLink && !confirm(t("regenerateConfirm"))) return;
    start(async () => {
      const res = await regenerateRiderLinkAction(r.id);
      if (res.error || !res.url) toast.error(res.error ?? t("error"));
      else {
        setLink({ riderId: r.id, url: res.url });
        router.refresh();
      }
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button onClick={() => setForm({ ...EMPTY })} disabled={pending}>
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>

      {form && (
        <Card>
          <p className="mb-3 font-semibold text-foreground">
            {form.id ? t("editTitle") : t("add")}
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-foreground">
              {t("name")}
              <Input name="riderName" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              {t("phone")}
              <Input name="riderPhone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              {t("lineId")}
              <Input name="riderLineId" value={form.lineId} maxLength={50} autoCapitalize="none" placeholder={t("lineIdHint")} onChange={(e) => setForm({ ...form, lineId: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              {t("commissionType")}
              <select
                name="commissionType"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground"
                value={form.commissionType}
                onChange={(e) => setForm({ ...form, commissionType: e.target.value as RiderCommissionType })}
              >
                {(Object.keys(TYPE_KEY) as RiderCommissionType[]).map((k) => (
                  <option key={k} value={k}>{t(TYPE_KEY[k])}</option>
                ))}
              </select>
            </label>
            {form.commissionType !== "full_fee" && (
              <label className="flex flex-col gap-1 text-sm text-foreground">
                {form.commissionType === "per_trip" ? t("bahtPerTrip") : t("percentOfFee")}
                <Input name="commissionValue" type="number" min={0} inputMode="decimal" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: e.target.value })} />
              </label>
            )}
            {form.id && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                {t("activeToggle")}
              </label>
            )}
            <div className="flex gap-2">
              <Button onClick={save} disabled={pending}>{t("save")}</Button>
              <Button variant="ghost" onClick={() => setForm(null)} disabled={pending}>{t("cancel")}</Button>
            </div>
          </div>
        </Card>
      )}

      {riders.length === 0 ? (
        <EmptyState icon={<Bike />} title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        riders.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <RiderAvatar rider={r} size={36} />
                  {r.name}
                </p>
                <p className="text-sm text-muted">{r.phone} · {commissionText(r)}</p>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <RiderStatusBadges rider={r} />
                  <RiderContactButtons rider={r} />
                </div>
              </div>
              <Badge tone={r.active ? "success" : "neutral"}>{r.active ? t("statusActive") : t("statusInactive")}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(r)} disabled={pending}>
                <Pencil className="size-4" />
                {t("edit")}
              </Button>
              {r.active && (
                <Button size="sm" variant="outline" onClick={() => regenerate(r)} disabled={pending}>
                  {r.hasLink ? <RefreshCw className="size-4" /> : <Link2 className="size-4" />}
                  {r.hasLink ? t("regenerate") : t("createLink")}
                </Button>
              )}
            </div>
            {link?.riderId === r.id && (
              <div className="mt-3 rounded-lg bg-muted-surface p-3 text-sm">
                <p className="mb-1 text-muted">{t("linkOnce")}</p>
                <p data-testid="rider-link" className="break-all font-mono text-xs text-foreground">{link.url}</p>
                <Button size="sm" className="mt-2" onClick={() => copy(link.url)}>
                  <Copy className="size-4" />
                  {t("copyLink")}
                </Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
