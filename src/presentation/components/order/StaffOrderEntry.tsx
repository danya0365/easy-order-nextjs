"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Minus, Plus, Search, UserPlus, X } from "lucide-react";

import type { MenuItem, OrderPaymentMethod } from "@/src/domain/entities";
import type { KioskMenuSection } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import {
  placeOrderForCustomerAction,
  type PlaceOrderResult,
} from "@/src/presentation/actions/order-actions";
import { satangToBaht } from "@/src/presentation/lib/money";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { cn } from "@/src/presentation/components/ui/cn";
import { useToast } from "@/src/presentation/components/ui/Toast";

export interface CustomerOption {
  id: string;
  phone: string;
  displayName: string | null;
}

type Cart = Record<string, number>; // menuItemId -> qty
const MAX_SUGGESTIONS = 8;

/** Branch choice for walk-in orders (multi-branch shops only). */
export interface CounterBranchOption {
  id: string;
  name: string;
  /** Not accepting online/kiosk orders right now (walk-in still allowed). */
  closed?: boolean;
  /** Menu item ids sold out at this branch (hidden while it is selected). */
  soldOutIds?: string[];
}

export function StaffOrderEntry({
  sections: allSections,
  hasPromptpay,
  customers,
  branches = [],
  defaultBranchId = null,
  branchLocked = false,
}: {
  sections: KioskMenuSection[];
  hasPromptpay: boolean;
  customers: CustomerOption[];
  /** >1 entries → show the branch picker (or a fixed label when locked). */
  branches?: CounterBranchOption[];
  defaultBranchId?: string | null;
  /** Branch staff: fixed to their own branch (server enforces it too). */
  branchLocked?: boolean;
}) {
  const t = useTranslations("order");
  const tb = useTranslations("branch");
  const multi = branches.length > 1 || (branchLocked && branches.length === 1 && !!defaultBranchId);
  const [branchId, setBranchId] = useState<string | null>(
    defaultBranchId && branches.some((b) => b.id === defaultBranchId)
      ? defaultBranchId
      : branches[0]?.id ?? null,
  );
  const branch = branches.find((b) => b.id === branchId) ?? null;
  // Hide items sold out at the selected branch (menu itself is shop-wide).
  const sections = useMemo(() => {
    const sold = new Set(branch?.soldOutIds ?? []);
    if (sold.size === 0) return allSections;
    return allSections
      .map((sec) => ({ ...sec, items: sec.items.filter((i) => !sold.has(i.id)) }))
      .filter((sec) => sec.items.length > 0);
  }, [allSections, branch]);
  const toast = useToast();
  const [cart, setCart] = useState<Cart>({});
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<OrderPaymentMethod>(
    hasPromptpay ? "promptpay_qr" : "cash",
  );
  const [result, setResult] = useState<PlaceOrderResult | null>(null);
  const [pending, start] = useTransition();

  // --- customer picker ---
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isNew, setIsNew] = useState(false);

  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const s of sections) for (const it of s.items) map.set(it.id, it);
    return map;
  }, [sections]);

  const digits = query.replace(/\D/g, "");
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          (digits.length > 0 && c.phone.includes(digits)) ||
          (q.length > 0 && (c.displayName?.toLowerCase().includes(q) ?? false)),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [customers, digits, q]);
  const exactMatch = digits.length > 0 && customers.some((c) => c.phone === digits);
  const canCreate = digits.length >= 9 && !exactMatch;
  const hasCustomer = phone !== "";

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalSatang = Object.entries(cart).reduce((sum, [id, qty]) => {
    const it = itemsById.get(id);
    return sum + (it ? it.priceSatang * qty : 0);
  }, 0);

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function selectCustomer(c: CustomerOption) {
    setPhone(c.phone);
    setName(c.displayName ?? "");
    setIsNew(false);
    setQuery(c.displayName ? `${c.displayName} · ${c.phone}` : c.phone);
    setOpen(false);
  }

  function startNew() {
    setPhone(digits);
    setName("");
    setIsNew(true);
    setQuery(digits);
    setOpen(false);
  }

  function clearCustomer() {
    setPhone("");
    setName("");
    setIsNew(false);
    setQuery("");
  }

  function placeOrder() {
    start(async () => {
      const res = await placeOrderForCustomerAction({
        cart: Object.entries(cart).map(([menuItemId, quantity]) => ({
          menuItemId,
          quantity,
        })),
        paymentMethod: method,
        note: note.trim() || null,
        customerName: name.trim() || null,
        customerPhone: phone.trim() || null,
        branchId: multi ? branchId : null,
      });
      if (res.ok) setResult(res);
      else toast.error(res.error || t("orderError"));
    });
  }

  function reset() {
    setCart({});
    setNote("");
    setMethod(hasPromptpay ? "promptpay_qr" : "cash");
    setResult(null);
    clearCustomer();
  }

  // ----- Result -----
  if (result?.ok) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-6 text-center">
        <p className="text-sm text-muted">{t("resultQueueTitle")}</p>
        <p className="text-6xl font-extrabold text-brand-600">{result.orderNo}</p>
        {result.branchName && (
          <p className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700" data-testid="result-branch">
            <MapPin className="size-4" />
            {tb("orderAtBranch", { name: result.branchName })}
          </p>
        )}
        <p className="text-lg font-semibold text-foreground">
          {t("total", { amount: satangToBaht(result.totalSatang ?? 0) })}
        </p>

        {result.qrDataUrl && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-foreground">{t("payQrTitle")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR */}
            <img
              src={result.qrDataUrl}
              alt={t("payQrTitle")}
              className="size-56 rounded-xl border border-border bg-card p-2"
            />
          </div>
        )}

        {result.bindQrDataUrl && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">{t("historyQrTitle")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR */}
            <img
              src={result.bindQrDataUrl}
              alt={t("historyQrTitle")}
              className="size-40 rounded-xl border border-border bg-card p-2"
            />
            <p className="max-w-xs text-xs text-muted">{t("historyQrHint")}</p>
          </div>
        )}

        <Button size="lg" fullWidth onClick={reset} className="mt-2">
          {t("newOrder")}
        </Button>
      </div>
    );
  }

  // ----- Entry -----
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">{t("newOrderTitle")}</h1>

      {multi && branchLocked && branch && (
        <p className="inline-flex items-center gap-1 self-start rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700" data-testid="counter-branch-fixed">
          <MapPin className="size-4" />
          {tb("orderAtBranch", { name: branch.name })}
        </p>
      )}
      {multi && !branchLocked && (
        <Card>
          <CardHeader title={tb("counterBranchTitle")} subtitle={tb("counterBranchHint")} />
          <div className="flex flex-wrap gap-2" role="radiogroup" data-testid="counter-branch-picker">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={b.id === branchId}
                onClick={() => {
                  setBranchId(b.id);
                  // Drop cart lines that are sold out at the newly picked branch.
                  const sold = new Set(b.soldOutIds ?? []);
                  if (sold.size)
                    setCart((prev) =>
                      Object.fromEntries(Object.entries(prev).filter(([id]) => !sold.has(id))),
                    );
                }}
                data-testid="counter-branch-option"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
                  b.id === branchId
                    ? "bg-brand-500 text-on-brand ring-brand-500"
                    : "bg-card text-foreground ring-border hover:bg-muted-surface",
                )}
              >
                <MapPin className="size-4" />
                {b.name}
                {b.closed && <span className="text-xs opacity-80">({tb("statusClosed")})</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Customer picker */}
      <Card>
        <CardHeader title={t("customerSectionTitle")} />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9"
                inputMode="tel"
                placeholder={t("customerSearchPlaceholder")}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                  if (hasCustomer) {
                    setPhone("");
                    setName("");
                    setIsNew(false);
                  }
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
              />
            </span>
            {hasCustomer && (
              <Button type="button" variant="ghost" size="sm" onClick={clearCustomer}>
                <X className="size-4" />
                {t("clearCustomer")}
              </Button>
            )}
          </div>

          {open && (matches.length > 0 || canCreate) && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCustomer(c)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted-surface"
                  >
                    <span className="truncate text-foreground">
                      {c.displayName || t("noName")}
                    </span>
                    <span className="shrink-0 text-muted">{c.phone}</span>
                  </button>
                </li>
              ))}
              {canCreate && (
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={startNew}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-700 hover:bg-muted-surface"
                  >
                    <UserPlus className="size-4" />
                    {t("addNewCustomer", { phone: digits })}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {isNew && (
          <div className="mt-3">
            <Input
              placeholder={t("newCustomerNamePlaceholder")}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-muted">{t("customerHint")}</p>
      </Card>

      {/* Menu */}
      {sections.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">{t("noMenu")}</p>
        </Card>
      ) : (
        sections.map((section) => (
          <Card key={section.category.id}>
            <CardHeader title={section.category.name} />
            <ul className="flex flex-col divide-y divide-border">
              {section.items.map((item) => {
                const qty = cart[item.id] ?? 0;
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted">
                        ฿{satangToBaht(item.priceSatang)}
                      </p>
                    </div>
                    {qty === 0 ? (
                      <Button size="sm" onClick={() => setQty(item.id, 1)}>
                        <Plus className="size-4" />
                        {t("add")}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="-"
                          onClick={() => setQty(item.id, qty - 1)}
                          className="inline-flex size-9 items-center justify-center rounded-full bg-muted-surface text-foreground transition hover:bg-brand-100"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-6 text-center font-bold text-foreground">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label="+"
                          onClick={() => setQty(item.id, qty + 1)}
                          className="inline-flex size-9 items-center justify-center rounded-full bg-brand-500 text-on-brand transition hover:bg-brand-600"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      )}

      {/* Payment + note */}
      <Card>
        <CardHeader title={t("paymentTitle")} />
        {hasPromptpay ? (
          <div className="grid grid-cols-2 gap-2">
            <PayChoice
              active={method === "promptpay_qr"}
              label={t("payPromptpay")}
              onClick={() => setMethod("promptpay_qr")}
            />
            <PayChoice
              active={method === "cash"}
              label={t("payCash")}
              onClick={() => setMethod("cash")}
            />
          </div>
        ) : (
          <p className="text-sm text-muted">{t("cashOnly")}</p>
        )}
        <div className="mt-3">
          <Textarea
            rows={2}
            maxLength={200}
            placeholder={t("notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Card>

      {/* Submit (in-flow, above the app tab bar) */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {t("cartBar", { count, amount: satangToBaht(totalSatang) })}
          </span>
          <Button
            size="lg"
            className="ml-auto"
            onClick={placeOrder}
            disabled={count === 0 || pending}
            loading={pending}
          >
            {pending ? t("placing") : t("placeOrder")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PayChoice({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border px-3 py-3 text-sm font-medium transition",
        active
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-border bg-card text-foreground hover:border-brand-300",
      )}
    >
      {label}
    </button>
  );
}
