"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Gift, MonitorX, Phone, Save, ShieldCheck, Tag, UserCheck, X } from "lucide-react";

import { customerDetailAction, type CustomerDetailOp } from "@/src/presentation/actions/customer-crm-actions";
import { Button } from "@/src/presentation/components/ui/Button";
import { Card } from "@/src/presentation/components/ui/Card";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { CustomerRowActions } from "@/src/presentation/components/shop/CustomerRowActions";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function CustomerDetailActions({
  customerId,
  phone,
  displayName,
  note,
  tags,
  blocked,
  newMemberCleared,
  showNewMember,
  rewards,
  perms,
}: {
  customerId: string;
  phone: string;
  displayName: string;
  note: string;
  tags: string[];
  blocked: boolean;
  newMemberCleared: boolean;
  showNewMember: boolean;
  rewards: { id: string; name: string; pointsCost: number }[];
  perms: Record<"editName" | "note" | "tags" | "points" | "redeem" | "block" | "newMember" | "resetDevices" | "pdpa", boolean>;
}) {
  const t = useTranslations("customerDetail");
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(displayName);
  const [noteV, setNote] = useState(note);
  const [tagList, setTags] = useState<string[]>(tags);
  const [custom, setCustom] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [rewardId, setRewardId] = useState(rewards[0]?.id ?? "");

  function run(input: CustomerDetailOp, ok: string, after?: () => void) {
    start(async () => {
      const r = await customerDetailAction(customerId, input);
      if (r.error) toast.error(r.error);
      else {
        toast.success(ok);
        after?.();
        router.refresh();
      }
    });
  }
  async function guarded(title: string, message: string, input: CustomerDetailOp, ok: string, danger = true) {
    if (!(await confirm({ title, message, tone: danger ? "danger" : undefined, confirmLabel: title }))) return;
    run(input, ok);
  }
  const saveTags = (next: string[]) => {
    setTags(next);
    run({ op: "tags", tags: next }, t("saved"));
  };
  const toggleTag = (tag: string) =>
    saveTags(tagList.includes(tag) ? tagList.filter((x) => x !== tag) : [...tagList, tag]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">{t("editProfile")}</h2>
        <label className="flex flex-col gap-1 text-sm">
          {t("name")}
          <input className={field} value={name} maxLength={100} disabled={!perms.editName} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("note")}
          <textarea className={field} rows={3} value={noteV} maxLength={500} placeholder={t("notePlaceholder")} onChange={(e) => setNote(e.target.value)} />
        </label>
        <Button size="sm" disabled={pending} onClick={() => run({ op: "profile", displayName: name, note: noteV }, t("saved"))}>
          <Save className="size-4" />
          {t("save")}
        </Button>
      </Card>

      {perms.tags && (
      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Tag className="size-4" />
          {t("tags")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {["vip", "regular"].map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={pending}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-sm ${tagList.includes(tag) ? "border-brand-600 bg-brand-100 text-brand-700" : "border-border text-muted"}`}
            >
              {t(`tag_${tag}` as "tag_vip")}
            </button>
          ))}
          {tagList
            .filter((x) => x !== "vip" && x !== "regular")
            .map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted-surface px-3 py-1 text-sm">
                {tag}
                <button type="button" aria-label={t("removeTag")} disabled={pending} onClick={() => toggleTag(tag)}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = custom.trim().toLowerCase();
            if (v && !tagList.includes(v)) saveTags([...tagList, v]);
            setCustom("");
          }}
        >
          <input className={field} value={custom} maxLength={30} placeholder={t("customTag")} onChange={(e) => setCustom(e.target.value)} />
          <Button size="sm" type="submit" variant="outline" disabled={pending || !custom.trim()}>
            {t("add")}
          </Button>
        </form>
      </Card>
      )}

      {(perms.points || (perms.redeem && rewards.length > 0)) && (
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">{t("adjustPoints")}</h2>
        {perms.points && (<>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr]">
          <input className={field} type="number" inputMode="numeric" step={1} placeholder="+10 / -10" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <input className={field} value={reason} maxLength={200} placeholder={t("reasonRequired")} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !delta || Number(delta) === 0 || reason.trim().length < 2}
          onClick={() => run({ op: "points", delta: Number(delta), reason }, t("pointsAdjusted"), () => { setDelta(""); setReason(""); })}
        >
          {t("applyAdjust")}
        </Button>
        </>)}
        {perms.redeem && rewards.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
            <select className={field} value={rewardId} onChange={(e) => setRewardId(e.target.value)}>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({t("pointsCost", { n: r.pointsCost })})
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" disabled={pending || !rewardId} onClick={() => guarded(t("redeem"), t("redeemConfirm"), { op: "redeem", rewardId }, t("redeemed"), false)}>
              <Gift className="size-4" />
              {t("redeem")}
            </Button>
          </div>
        )}
      </Card>

      )}

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t("accountActions")}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {phone && <a href={`tel:${phone}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <Phone className="size-4" />
            {t("call")}
          </a>}
          {perms.block && (blocked ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => guarded(t("unblock"), t("unblockConfirm"), { op: "unblock" }, t("saved"), false)}>
              <UserCheck className="size-4" />
              {t("unblock")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => guarded(t("block"), t("blockConfirm"), { op: "block" }, t("saved"))}>
              <Ban className="size-4" />
              {t("block")}
            </Button>
          ))}
          {showNewMember && perms.newMember && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                newMemberCleared
                  ? run({ op: "restoreNewMember" }, t("saved"))
                  : guarded(t("clearNewMember"), t("clearNewMemberConfirm"), { op: "clearNewMember" }, t("saved"), false)
              }
            >
              <ShieldCheck className="size-4" />
              {newMemberCleared ? t("restoreNewMember") : t("clearNewMember")}
            </Button>
          )}
          {perms.resetDevices && <Button size="sm" variant="outline" disabled={pending} onClick={() => guarded(t("resetDevices"), t("resetDevicesConfirm"), { op: "resetDevices" }, t("devicesReset"))}>
            <MonitorX className="size-4" />
            {t("resetDevices")}
          </Button>}
        </div>
        {!perms.block && <p className="text-xs text-muted">{t("ownerOnlyHint")}</p>}
        {perms.pdpa && <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted">
          {t("pdpa")}
          <CustomerRowActions customerId={customerId} />
        </div>}
      </Card>
    </div>
  );
}
