"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Minus, Plus, ShoppingCart } from "lucide-react";

import type { MenuItem, MenuOptionGroup, OrderPaymentMethod } from "@/src/domain/entities";
import { formatOrderLineOptions } from "@/src/domain/services/menu-options";
import { useMenuCart } from "@/src/presentation/hooks/useMenuCart";
import { ItemDetailSheet } from "@/src/presentation/components/order/ItemDetailSheet";
import type { KioskMenuSection } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import {
  placeOrderAction,
  selfConfirmOrderAction,
  type PlaceOrderResult,
} from "@/src/presentation/actions/order-actions";
import { satangToBaht } from "@/src/presentation/lib/money";
import { menuImageSrc } from "@/src/presentation/lib/menu-image";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { Modal } from "@/src/presentation/components/ui/Modal";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { cn } from "@/src/presentation/components/ui/cn";
import { AttractScreen } from "@/src/presentation/components/kiosk/AttractScreen";

type ReceiptLine = { name: string; qty: number; lineSatang: number };

// After this much inactivity (empty cart, no order in flight) the attract screen
// appears; the finished-order screen auto-clears after this long for the next customer.
const ATTRACT_IDLE_MS = 60_000;
const RESULT_RESET_MS = 60_000;
// Self-service: the "pay now" screen waits longer (customer is paying); the
// "done / pick up" screen clears quickly for the next customer.
const SELF_PAY_TIMEOUT_MS = 180_000;
const SELF_DONE_RESET_MS = 25_000;

export function KioskOrdering({
  sections,
  hasPromptpay,
  shopName = "",
  selfService = false,
  optionGroups = null,
  itemDetailEnabled = false,
}: {
  optionGroups?: MenuOptionGroup[] | null;
  itemDetailEnabled?: boolean;
  sections: KioskMenuSection[];
  hasPromptpay: boolean;
  shopName?: string;
  selfService?: boolean;
}) {
  const t = useTranslations("kiosk");
  const toast = useToast();
  const mc = useMenuCart(sections, optionGroups);
  const { cart, count, lines: cartLines } = mc;
  const totalSatang = mc.subtotalSatang;
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const hasGroups = (id: string) => (mc.groupsByItem.get(id)?.length ?? 0) > 0;
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [method, setMethod] = useState<OrderPaymentMethod>(
    hasPromptpay ? "promptpay_qr" : "cash",
  );
  const [result, setResult] = useState<PlaceOrderResult | null>(null);
  const [receipt, setReceipt] = useState<ReceiptLine[]>([]);
  const [idle, setIdle] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Self-service only: the customer tapped "ชำระเงินแล้ว" → order is paid+completed.
  const [paid, setPaid] = useState(false);
  const [pending, start] = useTransition();
  const [confirming, startConfirm] = useTransition();

  const setQty = mc.setLineQty;

  function placeOrder() {
    start(async () => {
      const res = await placeOrderAction({
        cart: mc.payload(),
        paymentMethod: method,
        note: note.trim() || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
      });
      if (res.ok) {
        // Snapshot the cart as a receipt before it's cleared for the next order.
        const lines: ReceiptLine[] = cartLines.map((l) => ({
          name: l.options.length
            ? `${l.item.name} (${formatOrderLineOptions(l.options)})`
            : l.item.name,
          qty: l.qty,
          lineSatang: l.unitSatang * l.qty,
        }));
        setReceipt(lines);
        setResult(res);
        setCheckoutOpen(false);
      } else {
        toast.error(res.error || t("orderError"));
      }
    });
  }

  const reset = useCallback(() => {
    mc.clear();
    setNote("");
    setCustomerName("");
    setCustomerPhone("");
    setMethod(hasPromptpay ? "promptpay_qr" : "cash");
    setResult(null);
    setReceipt([]);
    setDetailsOpen(false);
    setPaid(false);
    setIdle(false);
  }, [hasPromptpay, mc.clear]);

  /** Self-service: customer confirms they paid → mark the order paid + completed. */
  function selfConfirm() {
    if (!result?.orderId) return;
    startConfirm(async () => {
      const res = await selfConfirmOrderAction(result.orderId!);
      if (res.ok) setPaid(true);
      else toast.error(res.error || t("orderError"));
    });
  }

  // Auto-clear the finished-order screen so the next customer starts fresh. In
  // self-service the "pay now" screen waits longer (customer is mid-payment);
  // once paid (or in staffed mode) it clears on the normal timer.
  useEffect(() => {
    if (!result?.ok) return;
    const ms =
      selfService && !paid
        ? SELF_PAY_TIMEOUT_MS
        : selfService && paid
          ? SELF_DONE_RESET_MS
          : RESULT_RESET_MS;
    const id = setTimeout(reset, ms);
    return () => clearTimeout(id);
  }, [result?.ok, paid, selfService, reset]);

  // Idle → attract screen, but only when there's nothing in progress to preserve
  // (empty cart, no open checkout, no finished-order screen). Any interaction rearms.
  // When something is in progress we simply don't arm the timer; the render is also
  // gated below so a stale `idle` never shows over a non-empty cart.
  useEffect(() => {
    if (count > 0 || checkoutOpen || result?.ok) return;
    let timer = setTimeout(() => setIdle(true), ATTRACT_IDLE_MS);
    const bump = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ATTRACT_IDLE_MS);
    };
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [count, checkoutOpen, result?.ok]);

  // ----- Result screen (next-customer reset) -----
  if (result?.ok) {
    const wrap = (children: ReactNode) => (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        {children}
      </div>
    );
    const receiptBlock = receipt.length > 0 && (
      <div className="w-full rounded-2xl border border-border bg-card p-4 text-left">
        <p className="mb-2 text-sm font-semibold text-foreground">
          {t("resultItemsTitle")}
        </p>
        <ul className="flex flex-col divide-y divide-border">
          {receipt.map((line, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-foreground">
                {line.name} ×{line.qty}
              </span>
              <span className="shrink-0 text-muted">
                {satangToBaht(line.lineSatang)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
    const bindQrBlock = result.bindQrDataUrl && (
      <div className="mt-2 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-base font-semibold text-foreground">
          {t("historyQrTitle")}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, not a remote asset */}
        <img
          src={result.bindQrDataUrl}
          alt={t("historyQrTitle")}
          className="size-48 rounded-xl border border-border bg-card p-2"
        />
        <p className="max-w-xs text-center text-sm text-muted">
          {t("historyQrHint")}
        </p>
      </div>
    );

    // --- Self-service: pay-yourself, then pick-up (no staff at the counter) ---
    if (selfService && !paid) {
      return wrap(
        <>
          <p className="text-xl font-semibold text-foreground">
            {t("resultTotal", { amount: satangToBaht(result.totalSatang ?? 0) })}
          </p>
          {receiptBlock}
          {result.paymentMethod === "promptpay_qr" && result.qrDataUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, not a remote asset */}
              <img
                src={result.qrDataUrl}
                alt={t("qrAlt")}
                className="size-64 rounded-xl border border-border bg-card p-2"
              />
              <p className="text-base text-muted">{t("selfPayHintQr")}</p>
            </div>
          ) : (
            <p className="text-base text-muted">{t("selfPayHintCash")}</p>
          )}
          <Button
            size="lg"
            fullWidth
            onClick={selfConfirm}
            disabled={confirming}
            loading={confirming}
            className="mt-2"
          >
            <Check className="size-5" />
            {t("selfPayConfirm")}
          </Button>
        </>,
      );
    }

    if (selfService && paid) {
      return wrap(
        <>
          <span className="grid size-16 place-items-center rounded-full bg-success-surface text-success">
            <Check className="size-9" />
          </span>
          <p className="text-lg font-semibold text-success">{t("selfDoneTitle")}</p>
          <p className="text-sm text-muted">{t("resultQueueTitle")}</p>
          <p className="text-7xl font-extrabold text-brand-600">{result.orderNo}</p>
          <p className="text-xl font-semibold text-foreground">{t("selfServeNow")}</p>
          {bindQrBlock}
          <Button size="lg" fullWidth onClick={reset} className="mt-4">
            {t("startNew")}
          </Button>
        </>,
      );
    }

    // --- Staffed (default): show queue number + pay-at-counter ---
    return wrap(
      <>
        <p className="text-lg text-muted">{t("resultQueueTitle")}</p>
        <p className="text-7xl font-extrabold text-brand-600">{result.orderNo}</p>
        <p className="text-xl font-semibold text-foreground">
          {t("resultTotal", { amount: satangToBaht(result.totalSatang ?? 0) })}
        </p>
        {receiptBlock}
        {result.paymentMethod === "promptpay_qr" && result.qrDataUrl ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, not a remote asset */}
            <img
              src={result.qrDataUrl}
              alt={t("qrAlt")}
              className="size-64 rounded-xl border border-border bg-card p-2"
            />
            <p className="text-base text-muted">{t("resultPromptpay")}</p>
          </div>
        ) : (
          <p className="text-base text-muted">{t("resultCash")}</p>
        )}
        {bindQrBlock}
        <Button size="lg" fullWidth onClick={reset} className="mt-4">
          {t("startNew")}
        </Button>
      </>,
    );
  }

  // ----- Menu browse -----
  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <EmptyState
          title={t("emptyMenuTitle")}
          description={t("emptyMenuDesc")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      {idle && count === 0 && !checkoutOpen && (
        <AttractScreen shopName={shopName} onDismiss={() => setIdle(false)} />
      )}
      <h1 className="mb-3 text-xl font-bold text-foreground">{t("menuTitle")}</h1>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.category.id}>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              {section.category.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.items.map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  qty={hasGroups(item.id) ? mc.qtyOfItem(item.id) : cart[item.id] ?? 0}
                  onChange={(q) => setQty(item.id, q)}
                  withOptions={hasGroups(item.id)}
                  onOpen={
                    itemDetailEnabled || hasGroups(item.id)
                      ? () => setDetailItem(item)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky cart bar */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShoppingCart className="size-5 text-brand-600" />
              {t("cartBar", {
                count,
                amount: satangToBaht(totalSatang),
              })}
            </span>
            <Button
              size="lg"
              className="ml-auto"
              onClick={() => setCheckoutOpen(true)}
            >
              {t("viewCart")}
            </Button>
          </div>
        </div>
      )}

      {detailItem && (
        <ItemDetailSheet
          item={detailItem}
          groups={mc.groupsByItem.get(detailItem.id) ?? []}
          onClose={() => setDetailItem(null)}
          onAdd={(ids, q) => mc.addLine(detailItem.id, ids, q)}
        />
      )}

      {/* Checkout */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title={t("cartTitle")}
      >
        <div className="flex flex-col gap-4">
          {count === 0 ? (
            <p className="text-sm text-muted">{t("cartEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {cartLines.map((l) => (
                <li
                  key={l.key}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="min-w-0 text-foreground">
                    <span className="truncate">
                      {l.item.name} ×{l.qty}
                    </span>
                    {l.options.length > 0 && (
                      <span className="block text-xs text-muted">
                        {formatOrderLineOptions(l.options)}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-muted">
                    {l.options.length > 0 && (
                      <button
                        type="button"
                        aria-label="-"
                        onClick={() => setQty(l.key, l.qty - 1)}
                        className="inline-flex size-7 items-center justify-center rounded-full bg-muted-surface text-foreground"
                      >
                        <Minus className="size-3.5" />
                      </button>
                    )}
                    {satangToBaht(l.unitSatang * l.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Self-service keeps the optional note + identity collapsed so the
              default walk-in path is just items → payment → confirm. Staffed mode
              shows them inline. */}
          {selfService && !detailsOpen ? (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted transition hover:text-foreground"
            >
              <ChevronDown className="size-4" />
              {t("addDetails")}
            </button>
          ) : (
            <>
              <div>
                <label
                  htmlFor="kioskNote"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {t("noteLabel")}
                </label>
                <Textarea
                  id="kioskNote"
                  rows={2}
                  maxLength={200}
                  placeholder={t("notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Optional walk-in identity → builds an order history the customer
                  can view on their own phone. Leave blank to order anonymously. */}
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">
                  {t("customerTitle")}
                </p>
                <p className="mb-2 text-xs text-muted">{t("customerHint")}</p>
                <div className="flex flex-col gap-2">
                  <Input
                    id="kioskCustomerName"
                    maxLength={80}
                    placeholder={t("customerNamePlaceholder")}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <Input
                    id="kioskCustomerPhone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={20}
                    placeholder={t("customerPhonePlaceholder")}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              {t("paymentTitle")}
            </p>
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
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
            <span>{t("total")}</span>
            <span>{satangToBaht(totalSatang)}</span>
          </div>

          <Button
            size="lg"
            fullWidth
            onClick={placeOrder}
            disabled={count === 0 || pending}
            loading={pending}
          >
            {pending ? t("placing") : t("placeOrder")}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setCheckoutOpen(false)}
          >
            {t("backToMenu")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ItemTile({
  item,
  qty,
  onChange,
  withOptions = false,
  onOpen,
}: {
  item: MenuItem;
  qty: number;
  onChange: (qty: number) => void;
  withOptions?: boolean;
  onOpen?: () => void;
}) {
  const t = useTranslations("kiosk");
  const imageSrc = menuImageSrc(item);
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div
        {...(onOpen
          ? {
              role: "button",
              tabIndex: 0,
              onClick: onOpen,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter") onOpen();
              },
              className: "cursor-pointer",
              "data-testid": "menu-item-open",
            }
          : {})}
      >
        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own API route, not a remote CDN
          <img
            src={imageSrc}
            alt={item.name}
            className="mb-3 aspect-square w-full rounded-xl border border-border object-cover bg-muted-surface"
          />
        )}
        <p className="font-semibold text-foreground">{item.name}</p>
        {item.description && (
          <p className="mt-0.5 text-sm text-muted">{item.description}</p>
        )}
        <p className="mt-1 text-base font-medium text-brand-700">
          {t("baht", { amount: satangToBaht(item.priceSatang) })}
        </p>
      </div>

      {withOptions && onOpen ? (
        <Button size="lg" fullWidth onClick={onOpen} data-testid="menu-item-add-options">
          <Plus className="size-5" />
          {t("add")}
          {qty > 0 && ` (${qty})`}
        </Button>
      ) : qty === 0 ? (
        <Button size="lg" fullWidth onClick={() => onChange(1)}>
          <Plus className="size-5" />
          {t("add")}
        </Button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChange(qty - 1)}
            aria-label="-"
            className="inline-flex size-12 items-center justify-center rounded-full bg-muted-surface text-foreground transition hover:bg-brand-100"
          >
            <Minus className="size-5" />
          </button>
          <span className="text-xl font-bold text-foreground">{qty}</span>
          <button
            type="button"
            onClick={() => onChange(qty + 1)}
            aria-label="+"
            className="inline-flex size-12 items-center justify-center rounded-full bg-brand-500 text-on-brand transition hover:bg-brand-600"
          >
            <Plus className="size-5" />
          </button>
        </div>
      )}
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
