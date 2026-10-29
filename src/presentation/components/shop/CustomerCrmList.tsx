"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Ban, CheckCircle, ChevronRight, Crown, Download, Phone, QrCode, Store } from "lucide-react";

import { bulkCustomerAction, type BulkTarget } from "@/src/presentation/actions/customer-crm-actions";
import { PendingMemberActions } from "@/src/presentation/components/shop/PendingMemberActions";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";

export interface CrmListItem {
  id: string;
  name: string | null;
  phone: string;
  maskedPhone: string;
  orderCount: number;
  spend: string;
  lastOrder: string | null;
  points: number;
  pending: boolean;
  blocked: boolean;
  vip: boolean;
  tags: string[];
  channel: "static" | "instore";
  hasNote: boolean;
  flags?: string | null;
}

export function CustomerCrmList({
  items,
  exportQuery,
  query,
  total,
  bulkMax,
  base,
  canBulkBlock,
  canApprove,
}: {
  items: CrmListItem[];
  exportQuery: string;
  query: { tab: string; q: string; channel: string; sort: string };
  total: number;
  bulkMax: number;
  base: "/shop" | "/staff";
  canBulkBlock: boolean;
  canApprove: boolean;
}) {
  const t = useTranslations("customersCrm");
  const toast = useToast();
  const confirm = useConfirm();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [allMatching, setAllMatching] = useState(false);
  const all = items.length > 0 && items.every((i) => sel.has(i.id));
  const count = allMatching ? total : sel.size;

  const toggle = (id: string) => {
    setAllMatching(false);
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  function bulk(op: "approve" | "block") {
    start(async () => {
      if (allMatching && total > bulkMax) {
        toast.error(t("bulkTooMany", { max: bulkMax }));
        return;
      }
      if (op === "block" || allMatching) {
        const ok = await confirm({
          title: op === "block" ? t("bulkBlock") : t("bulkApprove"),
          message: op === "block" ? t("bulkBlockConfirm", { n: count }) : t("bulkApproveConfirm", { n: count }),
          tone: op === "block" ? "danger" : undefined,
          confirmLabel: op === "block" ? t("bulkBlock") : t("bulkApprove"),
        });
        if (!ok) return;
      }
      const target: BulkTarget = allMatching ? { query } : { ids: [...sel] };
      const r = await bulkCustomerAction(op, target);
      if (r.error) toast.error(r.error);
      else {
        toast.success(t("bulkDone", { done: r.done ?? 0, skipped: r.skipped ?? 0 }));
        setSel(new Set());
        setAllMatching(false);
      }
    });
  }

  const exportHref = `/api/shop/customers/export?${exportQuery}${!allMatching && sel.size ? `&ids=${[...sel].join(",")}` : ""}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg bg-card py-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={all}
            onChange={() => {
              setAllMatching(false);
              setSel(all ? new Set() : new Set(items.map((i) => i.id)));
            }}
          />
          {count > 0 ? t("selected", { n: count }) : t("selectPage")}
        </label>
        {all && total > items.length && !allMatching && (
          <button type="button" className="text-sm text-brand-600 underline" onClick={() => setAllMatching(true)}>
            {t("selectAllMatching", { n: total })}
          </button>
        )}
        {allMatching && (
          <button type="button" className="text-sm text-muted underline" onClick={() => { setAllMatching(false); setSel(new Set()); }}>
            {t("clearSelection")}
          </button>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {count > 0 && (
            <>
              {canApprove && <button type="button" disabled={pending} onClick={() => bulk("approve")} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm">
                <CheckCircle className="size-4" />
                {t("bulkApprove")}
              </button>}
              {canBulkBlock && <button type="button" disabled={pending} onClick={() => bulk("block")} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-error">
                <Ban className="size-4" />
                {t("bulkBlock")}
              </button>}
            </>
          )}
          <a href={exportHref} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm">
            <Download className="size-4" />
            {!allMatching && sel.size > 0 ? t("exportSelected") : t("exportCsv")}
          </a>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {items.map((c) => (
          <li key={c.id} className="flex items-start gap-3 py-3">
            <input type="checkbox" className="mt-1 size-5 shrink-0" checked={sel.has(c.id)} onChange={() => toggle(c.id)} aria-label={c.name ?? c.maskedPhone} />
            <div className="min-w-0 flex-1">
              <Link href={`${base}/customers/${c.id}`} className="flex items-center gap-1 font-medium text-foreground">
                {c.vip && <Crown className="size-4 shrink-0 text-amber-500" />}
                <span className="truncate">{c.name || t("noName")}</span>
              </Link>
              <p className="text-sm text-muted">{c.maskedPhone}</p>
              <p className="text-xs text-muted">
                {t("rowStats", { orders: c.orderCount, spend: c.spend, points: c.points })}
                {c.lastOrder ? ` · ${t("lastOrder", { date: c.lastOrder })}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {c.pending && <Badge tone="warning">{t("badgePending")}</Badge>}
                {c.blocked && <Badge tone="danger">{t("badgeBlocked")}</Badge>}
                <Badge tone="neutral">
                  <span className="inline-flex items-center gap-1">
                    {c.channel === "static" ? <QrCode className="size-3" /> : <Store className="size-3" />}
                    {c.channel === "static" ? t("channelStatic") : t("channelInstore")}
                  </span>
                </Badge>
                {c.tags.filter((x) => x !== "vip").map((tag) => (
                  <Badge key={tag} tone="brand">{tag}</Badge>
                ))}
                {c.hasNote && <Badge tone="neutral">{t("badgeNote")}</Badge>}
              </div>
              {c.flags && (
                <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="size-3.5" />
                  {c.flags}
                </p>
              )}
              {c.pending && (
                <div className="mt-2">
                  <PendingMemberActions customerId={c.id} canBlock={canBulkBlock} />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {c.phone && <a href={`tel:${c.phone}`} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-muted-surface" aria-label={t("call")} title={t("call")}>
                <Phone className="size-4" />
              </a>}
              <Link href={`${base}/customers/${c.id}`} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-muted-surface" aria-label={t("openDetail")} title={t("openDetail")}>
                <ChevronRight className="size-5" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
