"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Check, MapPin, Minus, Plus, ShoppingBag } from "lucide-react";

import type {
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
}: {
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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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
  const canSubmit =
    count > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length >= 9 &&
    (fulfillmentType === "pickup" || (address.trim().length > 0 && pin !== null)) &&
    !belowMin;

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
      });
      if (res.ok) setResult(res);
      else toast.error(res.error || t("orderError"));
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
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div
                    {...(canOpenDetail(item.id)
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
                      // eslint-disable-next-line @next/next/no-img-element -- served from our own API route, not a remote CDN
                      <img
                        src={imageSrc}
                        alt={item.name}
                        className="mb-3 aspect-square w-full rounded-xl border border-border bg-muted-surface object-cover"
                      />
                    )}
                    <p className="font-semibold text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-muted">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-base font-medium text-brand-700">
                      ฿{satangToBaht(item.priceSatang)}
                      {withOptions && (
                        <span className="ml-2 text-xs font-normal text-muted">{tOpt("hasOptions")}</span>
                      )}
                    </p>
                  </div>
                  {withOptions ? (
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
        />
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={20}
          required
          placeholder={t("onlinePhonePlaceholder")}
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
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
            {!pin && (
              <p className="text-xs text-amber-700">{t("deliveryPinRequired")}</p>
            )}
            <Textarea
              rows={2}
              maxLength={300}
              required
              placeholder={t("onlineAddressPlaceholder")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
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
            onClick={placeOrder}
            disabled={!canSubmit || pending}
            loading={pending}
          >
            {pending ? t("placing") : t("placeOrder")}
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
