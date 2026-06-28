"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import {
  requireShopWrite,
  operatorContext,
} from "@/src/infrastructure/auth/session";
import { requireKioskShop } from "@/src/infrastructure/auth/kiosk";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { AdvanceOrderStatusUseCase } from "@/src/application/use-cases/order/AdvanceOrderStatusUseCase";
import { ConfirmOrderPaymentUseCase } from "@/src/application/use-cases/order/ConfirmOrderPaymentUseCase";
import { GenerateBindCodeUseCase } from "@/src/application/use-cases/member/GenerateBindCodeUseCase";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { renderPromptPayQR } from "@/src/infrastructure/services/promptpay";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import type { OrderStatus, OrderPaymentMethod } from "@/src/domain/entities";
import type { Page } from "@/src/application/repositories/pagination";
import type { OrderWithItems } from "@/src/domain/entities";

// Anti-abuse: a single kiosk device shouldn't fire more than this many orders in
// the window (real counters peak well below it); breaching alerts admins + owner.
const ORDER_RATE_LIMIT = 30;
const ORDER_RATE_WINDOW_MS = 5 * 60_000;
// Counter staff/owner placing orders: generous hourly cap per operator.
const STAFF_ORDER_RATE_LIMIT = 200;
const STAFF_ORDER_RATE_WINDOW_MS = 60 * 60_000;

export interface PlaceOrderResult {
  ok?: true;
  error?: string;
  orderId?: string;
  orderNo?: number;
  totalSatang?: number;
  paymentMethod?: OrderPaymentMethod;
  /** PromptPay QR PNG data URL when paymentMethod === "promptpay_qr". */
  qrDataUrl?: string;
  /** Bind QR — present when the customer gave a phone; scan to view order history. */
  bindQrDataUrl?: string;
}

export interface PlaceOrderActionInput {
  cart: { menuItemId: string; quantity: number }[];
  paymentMethod: OrderPaymentMethod;
  note?: string | null;
  /** Optional walk-in identity entered at checkout. */
  customerName?: string | null;
  customerPhone?: string | null;
}

/**
 * Place an order from the kiosk. The shop is derived from the SERVER-validated
 * kiosk session (requireKioskShop) — NOT from any client input — so an order
 * can only be created on a device the shop activated. Rate-limited per device+IP.
 */
export async function placeOrderAction(
  input: PlaceOrderActionInput,
): Promise<PlaceOrderResult> {
  try {
    const shopId = await requireKioskShop();
    await assertShopActive(shopId);

    const ip = await getClientIp();
    const guard = await container.sensitiveActionGuard.check({
      key: `order_place:${shopId}:${ip}`,
      limit: ORDER_RATE_LIMIT,
      windowMs: ORDER_RATE_WINDOW_MS,
      shopId,
      ip,
      alertTitle: "⚠️ มีการสั่งออเดอร์ถี่ผิดปกติ",
      alertBody: `อุปกรณ์หนึ่งสั่งออเดอร์เกิน ${ORDER_RATE_LIMIT} ครั้งใน 5 นาที`,
    });
    if (!guard.allowed) {
      return { error: "สั่งออเดอร์ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
    }

    if (input.paymentMethod === "promptpay_qr") {
      const shop = await container.shopRepository.findById(shopId);
      if (!shop?.promptpayTarget) {
        return { error: "ร้านยังไม่ได้ตั้งค่า PromptPay กรุณาเลือกจ่ายเงินสด" };
      }
    }

    const order = await new PlaceOrderUseCase(
      container.orderRepository,
      container.menuItemRepository,
      container.customerRepository,
    ).execute({
      shopId,
      paymentMethod: input.paymentMethod,
      note: input.note ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      cart: input.cart,
    });

    // Tell the shop a new order arrived (in-app + LINE/email if configured).
    await container.notificationService.notifyShopOwner(shopId, {
      type: "new_order",
      title: `ออเดอร์ใหม่ #${order.orderNo}`,
      body: `มีออเดอร์ใหม่ ${order.items.length} รายการ รวม ${(order.totalSatang / 100).toFixed(2)} บาท`,
      linkUrl: "/shop/orders",
    });

    return await buildOrderResult(shopId, order, input.customerPhone ?? null);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Shared finalizer for a freshly placed order: render the PromptPay payment QR
 * (if applicable) and, when the customer gave a phone, a one-time history bind
 * QR they scan to view their orders. Bind-QR failures are non-fatal (the order
 * is already placed).
 */
async function buildOrderResult(
  shopId: string,
  order: OrderWithItems,
  customerPhone: string | null,
): Promise<PlaceOrderResult> {
  let qrDataUrl: string | undefined;
  if (order.paymentMethod === "promptpay_qr") {
    const shop = await container.shopRepository.findById(shopId);
    if (shop?.promptpayTarget) {
      qrDataUrl = await renderPromptPayQR(shop.promptpayTarget, order.totalSatang);
    }
  }

  let bindQrDataUrl: string | undefined;
  if (order.customerId && customerPhone?.trim()) {
    try {
      const shop = await container.shopRepository.findById(shopId);
      if (shop) {
        const { code } = await new GenerateBindCodeUseCase(
          container.customerRepository,
          container.bindCodeRepository,
        ).execute(shopId, customerPhone);
        const url = `${await getBaseUrl()}/s/${shop.slug}/link?code=${code}`;
        bindQrDataUrl = await renderQrDataUrl(url);
      }
    } catch {
      /* ignore — history binding is optional */
    }
  }

  return {
    ok: true,
    orderId: order.id,
    orderNo: order.orderNo,
    totalSatang: order.totalSatang,
    paymentMethod: order.paymentMethod,
    qrDataUrl,
    bindQrDataUrl,
  };
}

/**
 * Place an order on behalf of a customer from the authenticated counter UI
 * (owner OR branch staff). The shop comes from the logged-in operator, not a
 * kiosk device. Rate-limited per operator. Mirrors the customer identity +
 * payment handling of the kiosk flow.
 */
export async function placeOrderForCustomerAction(
  input: PlaceOrderActionInput,
): Promise<PlaceOrderResult> {
  try {
    const { actor, shopId } = await operatorContext();
    await assertShopActive(shopId);

    const guard = await container.sensitiveActionGuard.check({
      key: `order_staff:${shopId}:${actor.id}`,
      limit: STAFF_ORDER_RATE_LIMIT,
      windowMs: STAFF_ORDER_RATE_WINDOW_MS,
      shopId,
      actorUserId: actor.id,
      ip: await getClientIp(),
      alertTitle: "⚠️ มีการเปิดออเดอร์ถี่ผิดปกติ",
      alertBody: `บัญชีหนึ่งเปิดออเดอร์เกิน ${STAFF_ORDER_RATE_LIMIT} ครั้ง/ชม.`,
    });
    if (!guard.allowed) {
      return { error: "เปิดออเดอร์ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
    }

    if (input.paymentMethod === "promptpay_qr") {
      const shop = await container.shopRepository.findById(shopId);
      if (!shop?.promptpayTarget) {
        return { error: "ร้านยังไม่ได้ตั้งค่า PromptPay กรุณาเลือกจ่ายเงินสด" };
      }
    }

    const order = await new PlaceOrderUseCase(
      container.orderRepository,
      container.menuItemRepository,
      container.customerRepository,
    ).execute({
      shopId,
      paymentMethod: input.paymentMethod,
      note: input.note ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      performedBy: actor.id,
      cart: input.cart,
    });

    // Staff accountability: record who opened this counter order.
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.orderPlaced,
      targetType: "order",
      targetId: order.id,
      shopId,
      ip: await getClientIp(),
      metadata: { orderNo: order.orderNo },
    });

    revalidatePath("/shop/orders");
    revalidatePath("/staff");
    return await buildOrderResult(shopId, order, input.customerPhone ?? null);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Typeahead for the staff order-entry customer picker (shop-scoped). */
export async function searchCustomersAction(
  query: string,
): Promise<{ id: string; phone: string; displayName: string | null }[]> {
  const { shopId } = await operatorContext();
  const rows = await container.customerRepository.listByShop(shopId, query);
  return rows.map((c) => ({
    id: c.id,
    phone: c.phone,
    displayName: c.displayName,
  }));
}

/** Shop staff/owner advances an order along the queue (or cancels it). */
export async function advanceOrderStatusAction(
  orderId: string,
  to: OrderStatus,
): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new AdvanceOrderStatusUseCase(container.orderRepository).execute(
      shopId,
      orderId,
      to,
    );
    if (to === "cancelled") {
      await container.auditLogger.record({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: AUDIT_ACTIONS.orderCancelled,
        targetType: "order",
        targetId: orderId,
        shopId,
        ip: await getClientIp(),
      });
    }
    revalidatePath("/shop/orders");
    revalidatePath("/staff");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Shop staff/owner confirms payment received (QR or cash) for an order. */
export async function confirmOrderPaymentAction(
  orderId: string,
): Promise<{ error?: string }> {
  try {
    const { actor, shopId } = await requireShopWrite();
    await new ConfirmOrderPaymentUseCase(container.orderRepository).execute(
      shopId,
      orderId,
    );
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.orderPaymentConfirmed,
      targetType: "order",
      targetId: orderId,
      shopId,
      ip: await getClientIp(),
    });
    revalidatePath("/shop/orders");
    revalidatePath("/staff");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Next page of finished orders (history "load more"). */
export async function loadMoreOrderHistoryAction(
  cursor: string,
): Promise<Page<OrderWithItems>> {
  const { shopId } = await requireShopWrite();
  return container.orderRepository.pageHistoryByShop(shopId, { cursor });
}
