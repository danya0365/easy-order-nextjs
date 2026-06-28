"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import type {
  OrderStatus,
  OrderWithItems,
} from "@/src/domain/entities";
import {
  advanceOrderStatusAction,
  confirmOrderPaymentAction,
  loadMoreOrderHistoryAction,
} from "@/src/presentation/actions/order-actions";
import { satangToBaht } from "@/src/presentation/lib/money";
import { Card } from "@/src/presentation/components/ui/Card";
import { Button } from "@/src/presentation/components/ui/Button";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { LoadMore } from "@/src/presentation/components/ui/LoadMore";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";
import { useToast } from "@/src/presentation/components/ui/Toast";

const ACTIVE_ORDER: OrderStatus[] = ["pending", "preparing", "ready"];

/** The status an order advances to via the primary "next" button. */
const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: "preparing",
  preparing: "ready",
  ready: "completed",
};

const NEXT_LABEL_KEY: Record<string, "toPreparing" | "toReady" | "toCompleted"> = {
  pending: "toPreparing",
  preparing: "toReady",
  ready: "toCompleted",
};

const AUTO_REFRESH_MS = 15_000;

export function OrderQueue({
  activeOrders,
  historyInitial,
  historyCursor,
}: {
  activeOrders: OrderWithItems[];
  historyInitial: OrderWithItems[];
  historyCursor: string | null;
}) {
  const t = useTranslations("order");
  const router = useRouter();

  // Auto-refresh the queue so new orders surface without manual reload.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const byStatus = (s: OrderStatus) =>
    activeOrders.filter((o) => o.status === s);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{t("autoRefreshHint")}</p>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          <RefreshCw className="size-4" />
          {t("refresh")}
        </Button>
      </div>

      {activeOrders.length === 0 ? (
        <EmptyState
          title={t("emptyQueueTitle")}
          description={t("emptyQueueDesc")}
        />
      ) : (
        ACTIVE_ORDER.map((status) => {
          const orders = byStatus(status);
          if (orders.length === 0) return null;
          return (
            <section key={status} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted">
                {t(`status${cap(status)}` as StatusKey)} ({orders.length})
              </h2>
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </section>
          );
        })
      )}

      <HistorySection
        initialItems={historyInitial}
        initialCursor={historyCursor}
      />
    </div>
  );
}

type StatusKey =
  | "statusPending"
  | "statusPreparing"
  | "statusReady"
  | "statusCompleted"
  | "statusCancelled";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const t = useTranslations("order");
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  function advance(to: OrderStatus) {
    start(async () => {
      const res = await advanceOrderStatusAction(order.id, to);
      if (res.error) toast.error(res.error || t("actionError"));
      else router.refresh();
    });
  }

  function confirmPayment() {
    start(async () => {
      const res = await confirmOrderPaymentAction(order.id);
      if (res.error) toast.error(res.error || t("actionError"));
      else router.refresh();
    });
  }

  function cancel() {
    start(async () => {
      const ok = await confirm({
        title: t("cancelConfirmTitle"),
        message: t("cancelConfirmMessage"),
        confirmLabel: t("cancelConfirmLabel"),
        tone: "danger",
      });
      if (!ok) return;
      const res = await advanceOrderStatusAction(order.id, "cancelled");
      if (res.error) toast.error(res.error || t("actionError"));
      else router.refresh();
    });
  }

  const next = NEXT_STATUS[order.status];
  const paid = order.paymentStatus === "paid";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {t("orderNo", { no: order.orderNo })}
          </p>
          <p className="text-xs text-muted">{formatTime(order.createdAt)}</p>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={paid ? "success" : "neutral"}>
            {paid ? t("paid") : t("unpaid")} ·{" "}
            {order.paymentMethod === "promptpay_qr"
              ? t("methodPromptpay")
              : t("methodCash")}
          </Badge>
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {order.items.map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-2 text-sm text-foreground"
          >
            <span className="min-w-0 truncate">
              {it.nameSnapshot} ×{it.quantity}
            </span>
            <span className="shrink-0 text-muted">
              {satangToBaht(it.lineTotalSatang)}
            </span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-2 rounded-lg bg-muted-surface px-3 py-2 text-sm text-foreground">
          {t("noteLabel")}: {order.note}
        </p>
      )}

      {(order.customerName || order.customerPhone) && (
        <p className="mt-2 rounded-lg bg-muted-surface px-3 py-2 text-sm text-foreground">
          {t("customerLabel")}:{" "}
          {[order.customerName, order.customerPhone]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <p className="mt-2 text-xs text-muted">
        {order.performedByEmail
          ? `${t("placedByLabel")}: ${order.performedByEmail}`
          : t("selfServeTag")}
      </p>

      <p className="mt-3 text-right text-lg font-semibold text-foreground">
        {t("total", { amount: satangToBaht(order.totalSatang) })}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {next && (
          <Button onClick={() => advance(next)} disabled={pending}>
            {t(NEXT_LABEL_KEY[order.status])}
          </Button>
        )}
        {!paid && (
          <Button
            variant="outline"
            onClick={confirmPayment}
            disabled={pending}
          >
            {t("confirmPayment")}
          </Button>
        )}
        <Button variant="ghost" onClick={cancel} disabled={pending}>
          {t("cancel")}
        </Button>
      </div>
    </Card>
  );
}

function HistorySection({
  initialItems,
  initialCursor,
}: {
  initialItems: OrderWithItems[];
  initialCursor: string | null;
}) {
  const t = useTranslations("order");
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground"
        aria-expanded={open}
      >
        {t("historyTitle")}
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3">
          {initialItems.length === 0 ? (
            <p className="text-sm text-muted">{t("historyEmpty")}</p>
          ) : (
            <LoadMore<OrderWithItems>
              initialItems={initialItems}
              initialCursor={initialCursor}
              loadMore={(cursor) => loadMoreOrderHistoryAction(cursor)}
              getKey={(o) => o.id}
              renderItem={(o) => (
                <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium text-foreground">
                      {t("orderNo", { no: o.orderNo })}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {o.performedByEmail
                        ? `${t("placedByLabel")}: ${o.performedByEmail}`
                        : t("selfServeTag")}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted">
                      {satangToBaht(o.totalSatang)}
                    </span>
                    <Badge tone={o.status === "completed" ? "success" : "neutral"}>
                      {t(`status${cap(o.status)}` as StatusKey)}
                    </Badge>
                  </span>
                </li>
              )}
            />
          )}
        </div>
      )}
    </Card>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
