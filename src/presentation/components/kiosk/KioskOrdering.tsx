"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, ShoppingCart } from "lucide-react";

import type { MenuItem, OrderPaymentMethod } from "@/src/domain/entities";
import type { KioskMenuSection } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import {
  placeOrderAction,
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

type Cart = Record<string, number>; // menuItemId -> qty

export function KioskOrdering({
  sections,
  hasPromptpay,
}: {
  sections: KioskMenuSection[];
  hasPromptpay: boolean;
}) {
  const t = useTranslations("kiosk");
  const toast = useToast();
  const [cart, setCart] = useState<Cart>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [method, setMethod] = useState<OrderPaymentMethod>(
    hasPromptpay ? "promptpay_qr" : "cash",
  );
  const [result, setResult] = useState<PlaceOrderResult | null>(null);
  const [pending, start] = useTransition();

  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const s of sections) for (const it of s.items) map.set(it.id, it);
    return map;
  }, [sections]);

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

  function placeOrder() {
    start(async () => {
      const res = await placeOrderAction({
        cart: Object.entries(cart).map(([menuItemId, quantity]) => ({
          menuItemId,
          quantity,
        })),
        paymentMethod: method,
        note: note.trim() || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
      });
      if (res.ok) {
        setResult(res);
        setCheckoutOpen(false);
      } else {
        toast.error(res.error || t("orderError"));
      }
    });
  }

  function reset() {
    setCart({});
    setNote("");
    setCustomerName("");
    setCustomerPhone("");
    setMethod(hasPromptpay ? "promptpay_qr" : "cash");
    setResult(null);
  }

  // ----- Result screen (next-customer reset) -----
  if (result?.ok) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <p className="text-lg text-muted">{t("resultQueueTitle")}</p>
        <p className="text-7xl font-extrabold text-brand-600">{result.orderNo}</p>
        <p className="text-xl font-semibold text-foreground">
          {t("resultTotal", {
            amount: satangToBaht(result.totalSatang ?? 0),
          })}
        </p>

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

        <Button size="lg" fullWidth onClick={reset} className="mt-4">
          {t("startNew")}
        </Button>
      </div>
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
                  qty={cart[item.id] ?? 0}
                  onChange={(q) => setQty(item.id, q)}
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
              {Object.entries(cart).map(([id, qty]) => {
                const it = itemsById.get(id);
                if (!it) return null;
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-foreground">
                      {it.name} ×{qty}
                    </span>
                    <span className="shrink-0 text-muted">
                      {satangToBaht(it.priceSatang * qty)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

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
}: {
  item: MenuItem;
  qty: number;
  onChange: (qty: number) => void;
}) {
  const t = useTranslations("kiosk");
  const imageSrc = menuImageSrc(item);
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
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

      {qty === 0 ? (
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
