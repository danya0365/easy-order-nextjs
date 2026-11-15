"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, MapPin } from "lucide-react";

import { selectOrderBranchAction } from "@/src/presentation/actions/order-branch-actions";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { cn } from "@/src/presentation/components/ui/cn";

export interface BranchChoice {
  id: string;
  name: string;
  address: string | null;
  /** Thai reason when the branch can't take orders now (null = open). */
  closedReason: string | null;
}

/**
 * "สั่งจากสาขา: X · เปลี่ยน" — multi-branch shops only. Open branches are
 * selectable; closed ones are listed (disabled) with the reason so nothing
 * disappears without explanation. The server re-validates every switch.
 */
export function BranchSwitcher({
  slug,
  currentId,
  currentName,
  choices,
  defaultOpen = false,
}: {
  slug: string;
  currentId: string | null;
  currentName: string | null;
  choices: BranchChoice[];
  defaultOpen?: boolean;
}) {
  const t = useTranslations("branch");
  const [open, setOpen] = useState(defaultOpen);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const openCount = choices.filter((c) => !c.closedReason).length;

  function pick(c: BranchChoice) {
    if (c.closedReason || pending) return;
    if (c.id === currentId) {
      setOpen(false);
      return;
    }
    start(async () => {
      const res = await selectOrderBranchAction(slug, c.id);
      if (res.error) {
        toast.error(res.error);
        router.refresh();
        return;
      }
      toast.success(t("switchedTo", { name: c.name }));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div
        className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
        data-testid="order-branch-switcher"
      >
        <span
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700"
          data-testid="order-branch-name"
        >
          <MapPin className="size-4" />
          {currentName ? t("orderFrom", { name: currentName }) : t("pickBranch")}
        </span>
        {openCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
            data-testid="order-branch-change"
          >
            {t("change")}
          </button>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={t("pickBranchTitle")}>
        <p className="mb-3 text-sm text-muted">{t("pickBranchHint")}</p>
        <ul className="flex flex-col gap-2" data-testid="order-branch-list">
          {choices.map((c) => {
            const current = c.id === currentId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={!!c.closedReason || pending}
                  onClick={() => pick(c)}
                  data-testid="order-branch-option"
                  data-closed={c.closedReason ? "1" : "0"}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                    current && !c.closedReason
                      ? "border-brand-500 bg-brand-50"
                      : "border-border bg-card hover:bg-muted-surface",
                    c.closedReason && "cursor-not-allowed opacity-60 hover:bg-card",
                  )}
                >
                  <MapPin className="size-5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{c.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {c.closedReason ?? c.address ?? t("openNow")}
                    </span>
                  </span>
                  {current && !c.closedReason ? (
                    <Check className="size-5 shrink-0 text-brand-600" />
                  ) : (
                    !c.closedReason && <ChevronRight className="size-4 shrink-0 text-muted" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
