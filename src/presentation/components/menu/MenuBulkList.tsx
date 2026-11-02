"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { emitMenuBulkPatch } from "./menu-bulk-sync";
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleSlash,
  FolderInput,
  ListChecks,
  Search,
  Star,
  StarOff,
  Tag,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import {
  bulkQueryString,
  canRunBulkOp,
  planBulk,
  type BulkItem,
  type BulkListQuery,
  type BulkOp,
  type BulkSnapshot,
  type BulkStatusFilter,
  type PriceRounding,
} from "@/src/domain/services/menu-bulk";
import { bulkUpdateMenuItemsAction, listBulkMenuItemsAction, undoBulkMenuItemsAction } from "@/src/presentation/actions/menu-bulk-actions";
import type { BulkPageResult } from "@/src/presentation/lib/menu-bulk-page";
import { Button } from "@/src/presentation/components/ui/Button";
import { Card } from "@/src/presentation/components/ui/Card";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { cn } from "@/src/presentation/components/ui/cn";
import { satangToBaht } from "@/src/presentation/lib/money";

export type BulkListItem = BulkItem & { description: string | null };
type Dialog = null | "category" | "price" | "delete" | { op: BulkOp };

const PREVIEW_ROWS = 20;
const UNDO_MS = 10_000;

/**
 * Batch menu editing on /shop/menu. Filters + page live in the URL
 * (?bq=&bcat=&bstatus=&bpage=, history.replaceState). Only the CURRENT page is
 * sent to the client (server-side filter/paginate); changing filter/page fetches
 * one page via a light server action, and bulk ops patch local state from the
 * action result instead of a full router.refresh().
 * Every op shows a before/after preview; the server re-plans from DB state and
 * writes in one transaction. Non-delete ops can be undone for ~10s.
 */
export function MenuBulkList({
  initialPage,
  categories,
  initialQuery,
  initialOpen,
  role,
}: {
  initialPage: BulkPageResult | null;
  categories: { id: string; name: string }[];
  initialQuery: BulkListQuery;
  initialOpen: boolean;
  role: string;
}) {
  const t = useTranslations("menuBulk");
  const [open, setOpen] = useState(initialOpen);
  const [q, setQ] = useState<BulkListQuery>(initialQuery);
  const [data, setData] = useState<BulkPageResult | null>(initialPage);
  const [selected, setSelected] = useState<Map<string, BulkListItem>>(new Map());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ snap: BulkSnapshot[]; msg: string } | null>(null);
  const [pending, start] = useTransition();
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL (shareable, survives reload) without a server navigation.
  useEffect(() => {
    if (!open) return;
    const url = new URL(window.location.href);
    for (const k of ["bulk", "bq", "bcat", "bstatus", "bpage"]) url.searchParams.delete(k);
    const qs = bulkQueryString(q);
    url.search = [url.searchParams.toString(), "bulk=1", qs].filter(Boolean).join("&");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [q, open]);

  // Fetch the current page whenever the query changes (search debounced).
  const firstLoad = useRef(initialPage !== null);
  const reqId = useRef(0);
  const reload = useCallback(async (query: BulkListQuery) => {
    const id = ++reqId.current;
    const res = await listBulkMenuItemsAction(query);
    if (id === reqId.current && !res.error) setData(res);
  }, []);
  useEffect(() => {
    if (!open) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    const h = setTimeout(() => void reload(q), 250);
    return () => clearTimeout(h);
  }, [q, open, reload]);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const pg = data ?? { items: [], page: 1, totalPages: 1, total: 0 };
  const selItems = [...selected.values()];
  const sel = new Set(selected.keys());
  const staffOnly = !canRunBulkOp(role, "price");

  const setQuery = (patch: Partial<BulkListQuery>) => setQ((cur) => ({ ...cur, page: 1, ...patch }));
  const toggle = (item: BulkListItem) =>
    setSelected((s) => {
      const n = new Map(s);
      if (n.has(item.id)) n.delete(item.id);
      else n.set(item.id, item);
      return n;
    });
  const pageAllSelected = pg.items.length > 0 && pg.items.every((i) => selected.has(i.id));
  const togglePage = () =>
    setSelected((s) => {
      const n = new Map(s);
      for (const i of pg.items) {
        if (pageAllSelected) n.delete(i.id);
        else n.set(i.id, i);
      }
      return n;
    });

  /** Apply an action result locally (instant feedback, no page refresh). */
  const patch = (after?: BulkSnapshot[], deletedIds?: string[]) => {
    emitMenuBulkPatch({ after, deletedIds });
    const upd = new Map((after ?? []).map((a) => [a.id, a]));
    const gone = new Set(deletedIds ?? []);
    const fix = (i: BulkListItem): BulkListItem => {
      const a = upd.get(i.id);
      return a ? { ...i, categoryId: a.categoryId, priceSatang: a.priceSatang, isAvailable: a.isAvailable, isRecommended: a.isRecommended } : i;
    };
    setData((d) => d && { ...d, items: d.items.filter((i) => !gone.has(i.id)).map(fix), total: d.total - [...gone].filter((id) => d.items.some((i) => i.id === id)).length });
    setSelected((s) => new Map([...s].filter(([id]) => !gone.has(id)).map(([id, i]) => [id, fix(i)])));
  };

  const selectAllFiltered = () =>
    start(async () => {
      const res = await listBulkMenuItemsAction(q, true);
      if (!res.error && res.all) setSelected(new Map(res.all.map((i) => [i.id, i])));
    });

  const run = (op: BulkOp) => {
    setError(null);
    start(async () => {
      const res = await bulkUpdateMenuItemsAction([...sel], op);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDialog(null);
      patch(res.after, res.deletedIds);
      if (op.kind === "delete") setSelected(new Map());
      if (undoTimer.current) clearTimeout(undoTimer.current);
      if (res.undo && res.undo.length) {
        setUndo({ snap: res.undo, msg: t("done", { count: res.changed ?? 0 }) });
        undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
      } else {
        setUndo({ snap: [], msg: op.kind === "delete" ? `${t("deleted")} ${res.changed ?? 0}` : t("done", { count: res.changed ?? 0 }) });
        undoTimer.current = setTimeout(() => setUndo(null), 4000);
      }
      void reload(q);
    });
  };

  const doUndo = () => {
    if (!undo?.snap.length) return;
    const snap = undo.snap;
    start(async () => {
      const res = await undoBulkMenuItemsAction(snap);
      if (res.error) setUndo({ snap: [], msg: res.error });
      else {
        patch(res.after);
        setUndo({ snap: [], msg: t("undone") });
      }
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndo(null), 3000);
      void reload(q);
    });
  };

  if (!open) {
    return (
      <Card>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 text-left"
          data-testid="bulk-open"
        >
          <ListChecks className="size-5 shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-foreground">{t("title")}</span>
            <span className="block text-xs text-muted">{t("subtitle")}</span>
          </span>
          <ChevronRight className="size-4 text-muted" />
        </button>
      </Card>
    );
  }

  const opButtons: { key: string; label: string; icon: typeof Tag; onClick: () => void; kind: BulkOp["kind"]; danger?: boolean }[] = [
    { key: "on", label: t("opAvailable"), icon: CircleCheck, kind: "available", onClick: () => setDialog({ op: { kind: "available", value: true } }) },
    { key: "off", label: t("opSoldout"), icon: CircleSlash, kind: "available", onClick: () => setDialog({ op: { kind: "available", value: false } }) },
    { key: "cat", label: t("opCategory"), icon: FolderInput, kind: "category", onClick: () => setDialog("category") },
    { key: "price", label: t("opPrice"), icon: Tag, kind: "price", onClick: () => setDialog("price") },
    { key: "rec", label: t("opRecommendOn"), icon: Star, kind: "recommended", onClick: () => setDialog({ op: { kind: "recommended", value: true } }) },
    { key: "unrec", label: t("opRecommendOff"), icon: StarOff, kind: "recommended", onClick: () => setDialog({ op: { kind: "recommended", value: false } }) },
    { key: "del", label: t("opDelete"), icon: Trash2, kind: "delete", danger: true, onClick: () => setDialog("delete") },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-3" data-testid="menu-bulk">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-brand-600" />
          <h2 className="flex-1 font-semibold text-foreground">{t("title")}</h2>
          <button type="button" onClick={() => { setOpen(false); setSelected(new Map()); }} className="rounded-lg p-1.5 text-muted hover:bg-muted-surface" aria-label={t("close")}>
            <X className="size-4" />
          </button>
        </div>
        {staffOnly && <p className="text-xs text-amber-700">{t("staffOnlyNote")}</p>}

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={q.q}
              onChange={(e) => setQuery({ q: e.target.value })}
              placeholder={t("search")}
              className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm"
              data-testid="bulk-search"
            />
          </label>
          <div className="flex gap-2">
            <select value={q.cat ?? ""} onChange={(e) => setQuery({ cat: e.target.value || null })} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-2 py-2 text-sm" data-testid="bulk-cat" aria-label={t("categoryLabel")}>
              <option value="">{t("allCategories")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={q.status} onChange={(e) => setQuery({ status: e.target.value as BulkStatusFilter })} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-2 py-2 text-sm" data-testid="bulk-status" aria-label={t("statusLabel")}>
              <option value="all">{t("statusAll")}</option>
              <option value="available">{t("statusAvailable")}</option>
              <option value="soldout">{t("statusSoldout")}</option>
              <option value="recommended">{t("statusRecommended")}</option>
            </select>
          </div>
        </div>

        {/* Selection helpers */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" onClick={togglePage} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-brand-700 ring-1 ring-border" data-testid="bulk-select-page">
            <CheckCheck className="size-4" /> {t("selectPage")}
          </button>
          <button type="button" onClick={selectAllFiltered} className="rounded-lg px-2 py-1 font-medium text-brand-700 ring-1 ring-border" data-testid="bulk-select-filtered">
            {t("selectAllFiltered", { count: Math.min(pg.total, 200) })}
          </button>
          {sel.size > 0 && (
            <button type="button" onClick={() => setSelected(new Map())} className="rounded-lg px-2 py-1 text-muted">{t("clear")}</button>
          )}
        </div>

        {/* List */}
        {pg.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl ring-1 ring-border" data-testid="bulk-list">
            {pg.items.map((i) => (
              <li key={i.id}>
                <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5", selected.has(i.id) && "bg-brand-50")}>
                  <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i)} className="size-5 accent-brand-500" data-testid="bulk-check" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{i.name}</span>
                    <span className="block truncate text-xs text-muted">{catName.get(i.categoryId) ?? "-"}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold text-foreground">฿{satangToBaht(i.priceSatang)}</span>
                    <span className="flex gap-1">
                      {!i.isAvailable && <span className="rounded bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">{t("soldOutBadge")}</span>}
                      {i.isRecommended && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{t("recommendedBadge")}</span>}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        <nav className="flex items-center justify-between gap-2 text-sm" data-testid="bulk-pagination">
          <button type="button" disabled={pg.page <= 1} onClick={() => setQ((c) => ({ ...c, page: pg.page - 1 }))} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 ring-1 ring-border disabled:opacity-40">
            <ChevronLeft className="size-4" /> {t("prev")}
          </button>
          <span className="text-muted">{t("pageOf", { page: pg.page, total: pg.totalPages, count: pg.total })}</span>
          <button type="button" disabled={pg.page >= pg.totalPages} onClick={() => setQ((c) => ({ ...c, page: pg.page + 1 }))} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 ring-1 ring-border disabled:opacity-40" data-testid="bulk-next">
            {t("next")} <ChevronRight className="size-4" />
          </button>
        </nav>
        {sel.size > 0 && <div className="h-28" aria-hidden />}
      </div>

      {/* Bottom action bar — above the app tab bar (h-16 + safe area). */}
      {sel.size > 0 && (
        <div className="fixed inset-x-0 z-30 border-t border-border bg-card/95 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur" style={{ bottom: "calc(env(safe-area-inset-bottom) + 4rem)" }} data-testid="bulk-bar">
          <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground" data-testid="bulk-count">{t("selected", { count: sel.size })}</span>
              <button type="button" onClick={() => setSelected(new Map())} className="text-xs text-muted">{t("clear")}</button>
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {opButtons.filter((b) => canRunBulkOp(role, b.kind)).map((b) => (
                <button key={b.key} type="button" onClick={b.onClick} data-testid={`bulk-op-${b.key}`} className={cn("inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold ring-1 transition active:scale-95", b.danger ? "text-red-600 ring-red-200" : "text-foreground ring-border")}>
                  <b.icon className="size-4" /> {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Undo snackbar */}
      {undo && (
        <div className="fixed inset-x-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-card shadow-lg" style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }} data-testid="bulk-undo-bar" role="status">
          <span className="flex-1">{undo.msg}</span>
          {undo.snap.length > 0 && (
            <button type="button" onClick={doUndo} disabled={pending} className="inline-flex items-center gap-1 font-bold text-brand-300" data-testid="bulk-undo">
              <Undo2 className="size-4" /> {t("undo")}
            </button>
          )}
        </div>
      )}

      {dialog && (
        <BulkDialog
          dialog={dialog}
          items={selItems}
          categories={categories}
          catName={catName}
          pending={pending}
          error={error}
          onClose={() => { setDialog(null); setError(null); }}
          onConfirm={run}
        />
      )}
    </Card>
  );
}

function BulkDialog({
  dialog,
  items,
  categories,
  catName,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  dialog: Exclude<Dialog, null>;
  items: BulkListItem[];
  categories: { id: string; name: string }[];
  catName: Map<string, string>;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (op: BulkOp) => void;
}) {
  const t = useTranslations("menuBulk");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [mode, setMode] = useState<"set" | "baht" | "percent">("percent");
  const [amount, setAmount] = useState("");
  const [rounding, setRounding] = useState<PriceRounding>("baht");
  const [typed, setTyped] = useState("");

  let op: BulkOp | null = null;
  if (typeof dialog === "object") op = dialog.op;
  else if (dialog === "category") op = categoryId ? { kind: "category", categoryId } : null;
  else if (dialog === "delete") op = { kind: "delete" };
  else if (amount.trim() !== "" && Number.isFinite(Number(amount))) op = { kind: "price", mode, amount: Number(amount), rounding };

  let rows: ReturnType<typeof planBulk> = [];
  let planError: string | null = null;
  try {
    rows = op ? planBulk(items, op) : [];
  } catch (e) {
    planError = (e as Error).message;
  }
  const changed = rows.filter((r) => r.changed);
  const deleteOk = dialog !== "delete" || typed.trim() === String(items.length);
  const canConfirm = !!op && !planError && changed.length > 0 && deleteOk && !pending;

  const describe = (s: BulkSnapshot | null) => {
    if (!s) return t("deleted");
    if (!op) return "";
    if (op.kind === "available") return s.isAvailable ? t("statusAvailable") : t("soldOutBadge");
    if (op.kind === "recommended") return s.isRecommended ? t("recommendedBadge") : "—";
    if (op.kind === "category") return catName.get(s.categoryId) ?? "-";
    return `฿${satangToBaht(s.priceSatang)}`;
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("previewTitle")}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>{t("cancel")}</Button>
          <Button variant={dialog === "delete" ? "danger" : "primary"} className="flex-1" disabled={!canConfirm} loading={pending} onClick={() => op && onConfirm(op)} data-testid="bulk-confirm">
            {t("confirm")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-sm" data-testid="bulk-preview">
        {dialog === "category" && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t("categoryTarget")}</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-border bg-card px-2 py-2" data-testid="bulk-target-cat">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {dialog === "price" && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-1.5">
              {(["set", "baht", "percent"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={cn("rounded-lg px-2 py-2 text-xs font-semibold ring-1", mode === m ? "bg-brand-500 text-on-brand ring-brand-500" : "ring-border")} data-testid={`bulk-price-${m}`}>
                  {m === "set" ? t("priceSet") : m === "baht" ? t("priceBaht") : t("pricePercent")}
                </button>
              ))}
            </div>
            <input type="number" inputMode="decimal" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={mode === "set" ? "45" : mode === "baht" ? "+5 / -5" : "+10 / -10"} className="rounded-xl border border-border bg-card px-3 py-2" aria-label={t("priceAmount")} data-testid="bulk-price-amount" />
            <label className="flex items-center gap-2">
              <span className="shrink-0 font-medium">{t("rounding")}</span>
              <select value={rounding} onChange={(e) => setRounding(e.target.value as PriceRounding)} className="flex-1 rounded-xl border border-border bg-card px-2 py-2" data-testid="bulk-rounding">
                <option value="none">{t("roundNone")}</option>
                <option value="baht">{t("roundBaht")}</option>
                <option value="five">{t("roundFive")}</option>
                <option value="ten">{t("roundTen")}</option>
              </select>
            </label>
          </div>
        )}
        {dialog === "delete" && (
          <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 text-red-800">
            <p className="font-semibold">{t("deleteWarn")}</p>
            <label className="flex flex-col gap-1">
              <span>{t("deleteType", { count: items.length })}</span>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-foreground" data-testid="bulk-delete-type" />
            </label>
          </div>
        )}

        {planError ? (
          <p className="text-red-600" data-testid="bulk-plan-error">{planError}</p>
        ) : op ? (
          <>
            <p className="font-medium text-foreground" data-testid="bulk-summary">
              {changed.length ? t("previewSummary", { changed: changed.length, total: items.length }) : t("noChange")}
            </p>
            <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-xl ring-1 ring-border">
              {changed.slice(0, PREVIEW_ROWS).map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="shrink-0 text-muted line-through">{describe(r.before)}</span>
                  <ChevronRight className="size-3 shrink-0 text-muted" />
                  <span className={cn("shrink-0 font-semibold", r.after ? "text-foreground" : "text-red-600")}>{describe(r.after)}</span>
                </li>
              ))}
            </ul>
            {changed.length > PREVIEW_ROWS && <p className="text-xs text-muted">{t("previewMore", { count: changed.length - PREVIEW_ROWS })}</p>}
          </>
        ) : null}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700" data-testid="bulk-error">{error}</p>}
      </div>
    </Modal>
  );
}
