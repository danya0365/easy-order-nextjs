"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Ban, Check, MapPin, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { SoldOutOverlay } from "@/src/presentation/components/public-menu/MenuItemCard";

import type {
  CustomerLinkMode,
  FulfillmentType,
  MenuItem,
  MenuOptionGroup,
  OrderPaymentMethod,
} from "@/src/domain/entities";
import type { KioskMenuSection } from "@/src/application/use-cases/menu/GetKioskMenuUseCase";
import type { PlaceOrderResult } from "@/src/presentation/actions/order-actions";
import { placeOnlineOrderAction } from "@/src/presentation/actions/order-actions";
import { satangToBaht } from "@/src/presentation/lib/money";
import { menuImageSrc } from "@/src/presentation/lib/menu-image";
import { Button } from "@/src/presentation/components/ui/Button";
import { Input } from "@/src/presentation/components/ui/Input";
import { Textarea } from "@/src/presentation/components/ui/Textarea";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { useToast } from "@/src/presentation/components/ui/Toast";
import { cn } from "@/src/presentation/components/ui/cn";
import { useMenuCart } from "@/src/presentation/hooks/useMenuCart";
import { ItemDetailSheet } from "@/src/presentation/components/order/ItemDetailSheet";
import { formatOrderLineOptions } from "@/src/domain/services/menu-options";
import {
  LocationPicker,
  type LatLng,
} from "@/src/presentation/components/map/LocationPicker";


export interface OnlineOrderShopConfig {
  slug: string;
  name: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeSatang: number;
  deliveryNotes: string | null;
  minOrderSatang: number | null;
}

export function OnlineOrdering({
  slug,
  baseHref,
  sections,
  hasPromptPay,
  pickupEnabled,
  deliveryEnabled,
  deliveryFeeSatang,
  deliveryNotes,
  minOrderSatang,
  mapCenter,
  lastDelivery,
  optionGroups = null,
  itemDetailEnabled = false,
  rememberedContact = null,
  customerLinkMode = "auto",
}: {
  /** Name + phone of the customer this device is remembered for (member cookie). */
  rememberedContact?: { name: string; phone: string } | null;
  /** Shop setting: link the order's customer + remember this device. */
  customerLinkMode?: CustomerLinkMode;
  /** Option groups (only when menu options are effective for the shop). */
  optionGroups?: MenuOptionGroup[] | null;
  /** Platform switch: tap a menu item to open the detail sheet. */
  itemDetailEnabled?: boolean;
  slug: string;
  baseHref: string;
  sections: KioskMenuSection[];
  hasPromptPay: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeSatang: number;
  deliveryNotes: string | null;
  minOrderSatang: number | null;
  /** Where the delivery map opens before a pin exists (shop branch or Thailand). */
  mapCenter: { lat: number; lng: number; zoom: number };
  /** This member's last delivery pin (prefilled). */
  lastDelivery?: {
    lat: number;
    lng: number;
    address: string | null;
    landmark: string | null;
  } | null;
}) {
  const t = useTranslations("order");
  const tOpt = useTranslations("menuOptions");
  const toast = useToast();
  const mc = useMenuCart(sections, optionGroups);
  const { cart, count, subtotalSatang } = mc;
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    pickupEnabled ? "pickup" : "delivery",
  );
  const [customerName, setCustomerName] = useState(rememberedContact?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(rememberedContact?.phone ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linkConsent, setLinkConsent] = useState(false);
  const contactKey = `eo_contact_${slug}`;
  // Remembered device fallback: prefill from localStorage when the server
  // didn't (no member cookie yet). Never overwrites what's already typed.
  function prefillFromStorage() {
    if (rememberedContact || customerLinkMode === "off") return;
    try {
      const saved = JSON.parse(localStorage.getItem(contactKey) ?? "null") as
        | { name?: string; phone?: string }
        | null;
      if (saved?.name) setCustomerName((cur) => cur || saved.name || "");
      if (saved?.phone) setCustomerPhone((cur) => cur || saved.phone || "");
    } catch {
      /* ignore corrupt storage */
    }
  }
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);
  const [address, setAddress] = useState(lastDelivery?.address ?? "");
  const [landmark, setLandmark] = useState(lastDelivery?.landmark ?? "");
  const [pin, setPin] = useState<LatLng | null>(
    lastDelivery ? { lat: lastDelivery.lat, lng: lastDelivery.lng } : null,
  );
  // Last address we auto-filled from the map; replaced on the next pin move
  // unless the customer has typed their own.
  const autoAddress = useRef<string | null>(lastDelivery?.address ?? null);
  const onPlaceLabel = useCallback((label: string) => {
    setAddress((cur) => {
      if (cur.trim() === "" || cur === autoAddress.current) {
        autoAddress.current = label;
        return label;
      }
      return cur;
    });
  }, []);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<OrderPaymentMethod>(
    hasPromptPay ? "promptpay_qr" : "cash",
  );
  const [result, setResult] = useState<PlaceOrderResult | null>(null);
  const [pending, start] = useTransition();

  const deliveryFee =
    fulfillmentType === "delivery" ? deliveryFeeSatang : 0;
  const totalSatang = subtotalSatang + deliveryFee;
  const belowMin = minOrderSatang !== null && subtotalSatang < minOrderSatang;
  const canOpenSheet = count > 0 && !belowMin;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.name = t("errName");
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 10) e.phone = t("errPhone");
    if (fulfillmentType === "delivery") {
      if (!pin) e.pin = t("errPin");
      if (!address.trim()) e.address = t("errAddress");
    }
    if (count === 0) e.cart = t("cartEmpty");
    return e;
  }

  function confirmOrder() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) placeOrder();
  }

  const setQty = mc.setLineQty;
  const hasGroups = (id: string) => (mc.groupsByItem.get(id)?.length ?? 0) > 0;
  const canOpenDetail = (id: string) => itemDetailEnabled || hasGroups(id);
  const showLines = mc.lines.some((l) => l.options.length > 0);

  function placeOrder() {
    start(async () => {
      const res = await placeOnlineOrderAction({
        slug,
        cart: mc.payload(),
        paymentMethod: method,
        note: note.trim() || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        fulfillmentType,
        deliveryAddress: fulfillmentType === "delivery" ? address.trim() : null,
        deliveryLat: fulfillmentType === "delivery" ? pin?.lat ?? null : null,
        deliveryLng: fulfillmentType === "delivery" ? pin?.lng ?? null : null,
        deliveryLandmark:
          fulfillmentType === "delivery" ? landmark.trim() || null : null,
        linkConsent: customerLinkMode === "confirm" ? linkConsent : undefined,
      });
      if (res.ok) {
        if (res.linked) {
          try {
            localStorage.setItem(
              contactKey,
              JSON.stringify({ name: customerName.trim(), phone: customerPhone.trim() }),
            );
          } catch {
            /* storage unavailable */
          }
        }
        setSheetOpen(false);
        setResult(res);
      } else {
        setErrors({ form: res.error || t("orderError") });
        toast.error(res.error || t("orderError"));
      }
    });
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success-surface text-success">
          <Check className="size-9" />
        </span>
        <p className="text-lg text-muted">{t("resultQueueTitle")}</p>
        <p className="text-6xl font-extrabold text-brand-600">{result.orderNo}</p>
        <p className="text-lg font-semibold text-foreground">
          {t("total", { amount: satangToBaht(result.totalSatang ?? 0) })}
        </p>
        {result.qrDataUrl && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {t("payQrTitle")}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR */}
            <img
              src={result.qrDataUrl}
              alt={t("payQrTitle")}
              className="size-56 rounded-xl border border-border bg-card p-2"
            />
          </div>
        )}
        {result.paymentMethod === "cash" && (
          <p className="text-sm text-muted">{t("onlineCashNote")}</p>
        )}
        {result.bindQrDataUrl && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              {t("historyQrTitle")}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR */}
            <img
              src={result.bindQrDataUrl}
              alt={t("historyQrTitle")}
              className="size-40 rounded-xl border border-border bg-card p-2"
            />
            <p className="max-w-xs text-xs text-muted">{t("historyQrHint")}</p>
          </div>
        )}
        <Link
          href={baseHref}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100"
        >
          <ShoppingBag className="size-4" />
          {t("resultBackToShop")}
        </Link>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="py-10">
        <EmptyState title={t("noMenu")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Fulfillment */}
      <div className="grid grid-cols-2 gap-2">
        {pickupEnabled && (
          <FulfillChoice
            active={fulfillmentType === "pickup"}
            label={t("fulfillPickup")}
            onClick={() => setFulfillmentType("pickup")}
          />
        )}
        {deliveryEnabled && (
          <FulfillChoice
            active={fulfillmentType === "delivery"}
            label={
              deliveryFeeSatang > 0
                ? `${t("fulfillDelivery")} (+฿${satangToBaht(deliveryFeeSatang)})`
                : t("fulfillDelivery")
            }
            onClick={() => setFulfillmentType("delivery")}
          />
        )}
      </div>
      {fulfillmentType === "delivery" && deliveryNotes && (
        <p className="rounded-xl bg-muted-surface px-4 py-3 text-sm text-muted">
          {deliveryNotes}
        </p>
      )}

      {/* Menu */}
      {sections.map((section) => (
        <section key={section.category.id}>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {section.category.name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.items.map((item) => {
              const withOptions = hasGroups(item.id);
              const qty = withOptions ? mc.qtyOfItem(item.id) : cart[item.id] ?? 0;
              const imageSrc = menuImageSrc(item);
              const soldOut = !item.isAvailable;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div
                    {...(!soldOut && canOpenDetail(item.id)
                      ? {
                          role: "button",
                          tabIndex: 0,
                          onClick: () => setDetailItem(item),
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === "Enter") setDetailItem(item);
                          },
                          className: "cursor-pointer",
                          "data-testid": "menu-item-open",
                        }
                      : {})}
                  >
                    {imageSrc && (
                      <div className="relative mb-3 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element -- served from our own API route, not a remote CDN */}
                      <img
                        src={imageSrc}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={400}
                        className={`aspect-square w-full rounded-xl border border-border bg-muted-surface object-cover${soldOut ? " opacity-60 grayscale" : ""}`}
                      />
                      {soldOut && <SoldOutOverlay />}
                      </div>
                    )}
                    <p className={soldOut ? "font-semibold text-muted" : "font-semibold text-foreground"}>{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-muted">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-base font-medium text-brand-700">
                      <span className={soldOut ? "text-muted line-through decoration-red-500 decoration-2" : undefined}>
                        ฿{satangToBaht(item.priceSatang)}
                      </span>
                      {withOptions && (
                        <span className="ml-2 text-xs font-normal text-muted">{tOpt("hasOptions")}</span>
                      )}
                    </p>
                  </div>
                  {soldOut ? (
                    <Button fullWidth disabled variant="ghost" className="bg-muted-surface !text-red-600" data-testid="menu-item-soldout">
                      <Ban className="size-4" />
                      หมด
                    </Button>
                  ) : withOptions ? (
                    <Button fullWidth onClick={() => setDetailItem(item)} data-testid="menu-item-add-options">
                      <Plus className="size-4" />
                      {t("add")}
                      {qty > 0 && ` (${qty})`}
                    </Button>
                  ) : qty === 0 ? (
                    <Button fullWidth onClick={() => setQty(item.id, 1)}>
                      <Plus className="size-4" />
                      {t("add")}
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        aria-label="-"
                        onClick={() => setQty(item.id, qty - 1)}
                        className="inline-flex size-10 items-center justify-center rounded-full bg-muted-surface text-foreground transition hover:bg-brand-100"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="text-lg font-bold text-foreground">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label="+"
                        onClick={() => setQty(item.id, qty + 1)}
                        className="inline-flex size-10 items-center justify-center rounded-full bg-brand-500 text-on-brand transition hover:bg-brand-600"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {showLines && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4" data-testid="cart-lines">
          <h3 className="text-sm font-semibold text-foreground">{tOpt("cartTitle")}</h3>
          <ul className="flex flex-col divide-y divide-border">
            {mc.lines.map((l) => (
              <li key={l.key} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="text-foreground">{l.item.name}</span>
                  {l.options.length > 0 && (
                    <span className="block text-xs text-muted">{formatOrderLineOptions(l.options)}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button type="button" aria-label="-" onClick={() => setQty(l.key, l.qty - 1)} className="inline-flex size-8 items-center justify-center rounded-full bg-muted-surface text-foreground">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-5 text-center font-semibold text-foreground">{l.qty}</span>
                  <button type="button" aria-label="+" onClick={() => setQty(l.key, l.qty + 1)} className="inline-flex size-8 items-center justify-center rounded-full bg-brand-500 text-on-brand">
                    <Plus className="size-3.5" />
                  </button>
                  <span className="w-16 text-right text-muted">฿{satangToBaht(l.unitSatang * l.qty)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detailItem && (
        <ItemDetailSheet
          item={detailItem}
          groups={mc.groupsByItem.get(detailItem.id) ?? []}
          onClose={() => setDetailItem(null)}
          onAdd={(choiceIds, q) => mc.addLine(detailItem.id, choiceIds, q)}
        />
      )}

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("sheetTitle")}
          onClick={() => setSheetOpen(false)}
          data-testid="order-sheet"
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-lg font-bold text-foreground">{t("sheetTitle")}</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={t("sheetClose")}
                className="inline-flex size-9 items-center justify-center rounded-full bg-muted-surface text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              {/* Cart summary */}
              <div className="flex flex-col gap-1 rounded-2xl border border-border p-3" data-testid="sheet-cart">
                <ul className="flex flex-col divide-y divide-border">
                  {mc.lines.map((l) => (
                    <li key={l.key} className="flex items-start justify-between gap-2 py-1.5 text-sm">
                      <span className="min-w-0">
                        <span className="text-foreground">{l.qty} × {l.item.name}</span>
                        {l.options.length > 0 && (
                          <span className="block text-xs text-muted">{formatOrderLineOptions(l.options)}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-muted">฿{satangToBaht(l.unitSatang * l.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 flex justify-between border-t border-border pt-2 text-sm text-muted">
                  <span>{t("sheetSubtotal")}</span>
                  <span>฿{satangToBaht(subtotalSatang)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-muted">
                    <span>{t("sheetDeliveryFee")}</span>
                    <span>฿{satangToBaht(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-foreground">
                  <span>{t("sheetTotal")}</span>
                  <span>฿{satangToBaht(totalSatang)}</span>
                </div>
                {errors.cart && <FieldError>{errors.cart}</FieldError>}
              </div>

            {/* Identity + contact */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t("onlineContactTitle")}
              </h3>
              <Input
                maxLength={80}
                required
                placeholder={t("onlineNamePlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                aria-invalid={!!errors.name}
                data-testid="sheet-name"
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={20}
                required
                placeholder={t("onlinePhonePlaceholder")}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                aria-invalid={!!errors.phone}
                data-testid="sheet-phone"
              />
              {errors.phone && <FieldError>{errors.phone}</FieldError>}
              {fulfillmentType === "delivery" && (
                <div className="space-y-2" data-testid="delivery-location">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <MapPin className="size-4 text-brand-600" />
                    {t("deliveryPinTitle")}
                  </p>
                  <LocationPicker
                    value={pin}
                    fallbackCenter={{ lat: mapCenter.lat, lng: mapCenter.lng }}
                    fallbackZoom={mapCenter.zoom}
                    onChange={setPin}
                    onPlaceLabel={onPlaceLabel}
                  />
                  {errors.pin ? (
                    <FieldError>{errors.pin}</FieldError>
                  ) : (
                    !pin && <p className="text-xs text-amber-700">{t("deliveryPinRequired")}</p>
                  )}
                  <Textarea
                    rows={2}
                    maxLength={300}
                    required
                    placeholder={t("onlineAddressPlaceholder")}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    aria-invalid={!!errors.address}
                  />
                  {errors.address && <FieldError>{errors.address}</FieldError>}
                  <Input
                    maxLength={120}
                    placeholder={t("deliveryLandmarkPlaceholder")}
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                  />
                </div>
              )}
              <Textarea
                rows={2}
                maxLength={200}
                placeholder={t("notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                data-testid="sheet-note"
              />
            </div>

            {/* Payment */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t("paymentTitle")}
              </p>
              {hasPromptPay ? (
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

              {customerLinkMode === "confirm" && (
                <label className="flex items-start gap-3 text-sm text-foreground" data-testid="sheet-link-consent">
                  <input
                    type="checkbox"
                    checked={linkConsent}
                    onChange={(e) => setLinkConsent(e.target.checked)}
                    className="mt-1"
                  />
                  <span>{t("linkConsentLabel")}</span>
                </label>
              )}
              {errors.form && (
                <p role="alert" className="rounded-xl bg-error-surface px-3 py-2 text-sm text-error" data-testid="sheet-error">
                  {errors.form}
                </p>
              )}
            </div>
            <div className="border-t border-border p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <Button
                size="lg"
                fullWidth
                onClick={confirmOrder}
                disabled={pending}
                loading={pending}
                data-testid="sheet-confirm"
              >
                {pending ? t("placing") : t("sheetConfirm", { amount: satangToBaht(totalSatang) })}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky cart / place order bar — sits above the fixed shop tab bar
          (h-16 + safe-area inset), so it's never hidden behind it. */}
      <div
        className="sticky bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-30 -mx-4 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        data-testid="order-sticky-bar"
      >
        {belowMin && minOrderSatang !== null ? (
          <p className="text-center text-sm text-warning">
            {t("minOrderHint", { amount: satangToBaht(minOrderSatang) })}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {t("cartBar", { count, amount: satangToBaht(totalSatang) })}
          </span>
          <Button
            size="lg"
            className="ml-auto"
            onClick={() => {
              setErrors({});
              prefillFromStorage();
              setSheetOpen(true);
            }}
            disabled={!canOpenSheet || pending}
            data-testid="open-order-sheet"
          >
            {t("placeOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FulfillChoice({
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

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="-mt-1 text-xs text-error">
      {children}
    </p>
  );
}
