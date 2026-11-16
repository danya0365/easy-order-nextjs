"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { container } from "@/src/infrastructure/di/container";
import {
  requireShopWrite,
  operatorContext,
} from "@/src/infrastructure/auth/session";
import { requireKioskSession, requireKioskShop } from "@/src/infrastructure/auth/kiosk";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import {
  getOrderBranchId,
  mintWheelClaimToken,
  requireOrderAccess,
} from "@/src/infrastructure/auth/order-access";
import {
  assertOrderInQueueScope,
  orderQueueScope,
  queueBranchFilter,
} from "@/src/infrastructure/auth/order-queue-scope";
import { getMemberToken, setMemberCookie } from "@/src/infrastructure/auth/member";
import { LinkOrderCustomerDeviceUseCase } from "@/src/application/use-cases/member/LinkOrderCustomerDeviceUseCase";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import { AdvanceOrderStatusUseCase } from "@/src/application/use-cases/order/AdvanceOrderStatusUseCase";
import { ConfirmOrderPaymentUseCase } from "@/src/application/use-cases/order/ConfirmOrderPaymentUseCase";
import { SelfServeCompleteOrderUseCase } from "@/src/application/use-cases/order/SelfServeCompleteOrderUseCase";
import { EarnPointsFromOrderUseCase } from "@/src/application/use-cases/loyalty/EarnPointsFromOrderUseCase";
import { GenerateBindCodeUseCase } from "@/src/application/use-cases/member/GenerateBindCodeUseCase";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import { getBaseUrl } from "@/src/presentation/lib/base-url";
import { renderPromptPayQR } from "@/src/infrastructure/services/promptpay";
import { renderQrDataUrl } from "@/src/infrastructure/services/qr";
import { withCustomerNotes, type QueueOrder } from "@/src/presentation/lib/order-notes";
import { mainBranchOf } from "@/src/domain/services/branch-ordering";
import { COUNTER_BRANCH_COOKIE } from "@/src/presentation/lib/counter-branch";
import { grantWheelTicketsSafe, revokeWheelTicketsSafe, wheelService } from "@/src/presentation/lib/lucky-wheel";
import type {
  OrderStatus,
  OrderPaymentMethod,
  FulfillmentType,
} from "@/src/domain/entities";
import type { Page } from "@/src/application/repositories/pagination";
import type { OrderWithItems } from "@/src/domain/entities";

// Anti-abuse: a single kiosk device shouldn't fire more than this many orders in
// the window (real counters peak well below it); breaching alerts admins + owner.
const ORDER_RATE_LIMIT = 30;
const ORDER_RATE_WINDOW_MS = 5 * 60_000;
// Counter staff/owner placing orders: generous hourly cap per operator.
const STAFF_ORDER_RATE_LIMIT = 200;
const STAFF_ORDER_RATE_WINDOW_MS = 60 * 60_000;
// Public web (online) orders: a visitor shouldn't fire dozens of orders in a window.
const ONLINE_ORDER_RATE_LIMIT = 20;
const ONLINE_ORDER_RATE_WINDOW_MS = 5 * 60_000;
// Self-service "I paid" confirmations from a kiosk device — bounded per device+IP.
const SELF_PAY_RATE_LIMIT = 60;
const SELF_PAY_RATE_WINDOW_MS = 5 * 60_000;

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
  /** Branch that took the order — only set for multi-branch shops. */
  branchName?: string;
  /** Kiosk receipt: QR a member scans to claim this order's lucky-wheel spins. */
  wheelClaimQrDataUrl?: string;
}

/** Untrusted client cart → plain shape (ids as strings, bounded option lists). */
function sanitizeCart(cart: PlaceOrderActionInput["cart"]) {
  return (Array.isArray(cart) ? cart : []).map((l) => ({
    menuItemId: String(l?.menuItemId ?? ""),
    quantity: Number(l?.quantity),
    optionChoiceIds: Array.isArray(l?.optionChoiceIds)
      ? l.optionChoiceIds.slice(0, 50).map((x) => String(x))
      : [],
  }));
}

export interface PlaceOrderActionInput {
  cart: { menuItemId: string; quantity: number; optionChoiceIds?: string[] }[];
  paymentMethod: OrderPaymentMethod;
  note?: string | null;
  /** Optional walk-in identity entered at checkout. */
  customerName?: string | null;
  customerPhone?: string | null;
  /**
   * Counter (walk-in) only: branch picked by the operator. Owners may pick any
   * of the shop's branches; branch staff may only use their own (server-checked).
   * Ignored by the kiosk/online actions (their branch comes from the session).
   */
  branchId?: string | null;
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
    // Shop + branch come from the server-validated kiosk session (never client input).
    const { shopId, branchId: kioskBranchId } = await requireKioskSession();
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

    // Prepaid credit (block mode only): no new customer orders once the wallet is empty.
    try {
      await container.creditService.assertCanTakeOrder(shopId);
    } catch (e) {
      return { error: (e as Error).message };
    }

    const order = await new PlaceOrderUseCase(
      container.orderRepository,
      container.menuItemRepository,
      container.customerRepository,
      container.shopRepository,
      container.menuOptionRepository,
      container.platformSettingsRepository,
      container.branchRepository,
    ).execute({
      shopId,
      paymentMethod: input.paymentMethod,
      note: input.note ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      channel: "kiosk",
      branchId: kioskBranchId,
      cart: sanitizeCart(input.cart),
    });

    // Tell the shop a new order arrived (in-app + LINE/email if configured).
    await container.notificationService.notifyShopOwner(shopId, {
      type: "new_order",
      title: `ออเดอร์ใหม่ #${order.orderNo}`,
      body: `มีออเดอร์ใหม่ ${order.items.length} รายการ รวม ${(order.totalSatang / 100).toFixed(2)} บาท`,
      linkUrl: "/shop/orders",
    });

    const result = await buildOrderResult(shopId, order, input.customerPhone ?? null);
    // Lucky wheel: anonymous kiosk orders get a claim QR (members with a phone
    // on the order receive their tickets automatically once paid).
    if (!order.customerId) {
      try {
        const g = await wheelService().gate(shopId);
        if (g.enabled && g.shop && g.campaign && order.totalSatang >= g.campaign.minOrderSatang) {
          const token = mintWheelClaimToken(g.shop.slug, shopId, order.id);
          if (token) {
            const url = `${await getBaseUrl()}/s/${g.shop.slug}/wheel/claim?o=${encodeURIComponent(order.id)}&t=${encodeURIComponent(token)}`;
            result.wheelClaimQrDataUrl = await renderQrDataUrl(url);
          }
        }
      } catch {
        /* the wheel is optional — never block the order */
      }
    }
    return result;
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

  // Multi-branch shops: echo the branch on every success screen.
  let branchName: string | undefined;
  const branches = await container.branchRepository.listByShop(shopId);
  if (branches.filter((b) => b.isActive).length > 1) {
    branchName = (
      branches.find((b) => b.id === order.branchId) ?? mainBranchOf(branches)
    )?.name;
  }

  return {
    ok: true,
    orderId: order.id,
    orderNo: order.orderNo,
    totalSatang: order.totalSatang,
    paymentMethod: order.paymentMethod,
    qrDataUrl,
    bindQrDataUrl,
    branchName,
  };
}

export interface PlaceOnlineOrderActionInput extends PlaceOrderActionInput {
  slug: string;
  /** pickup or delivery (dine_in is kiosk-only and rejected by the use case). */
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryLandmark?: string | null;
  /** Order-sheet consent to link + remember this device ("confirm" mode). */
  linkConsent?: boolean;
}

export interface PlaceOnlineOrderResult extends PlaceOrderResult {
  /** Shop slug + fulfillment echo for the success screen. */
  shopSlug?: string;
  fulfillmentType?: FulfillmentType;
  /** True when this device is now remembered for the order's customer. */
  linked?: boolean;
}

/**
 * Place an order from the PUBLIC web page (/s/[slug]/order). Price tampering is
 * neutralized the same way as kiosk: names/fees come from the DB via the use
 * case. Rate-limited per shop+IP (public surface, unauthenticated).
 */
export async function placeOnlineOrderAction(
  input: PlaceOnlineOrderActionInput,
): Promise<PlaceOnlineOrderResult> {
  try {
    const shop = await container.shopRepository.findBySlug(input.slug);
    if (!shop) return { error: "ไม่พบร้านค้า" };
    await assertShopActive(shop.id);

    // Shop QR gate (server-side, mirrors the page UI): no valid order-access
    // cookie for THIS shop → reject, even if the UI was bypassed.
    await requireOrderAccess(input.slug, shop.id);

    const ip = await getClientIp();
    const guard = await container.sensitiveActionGuard.check({
      key: `order_online:${shop.id}:${ip}`,
      limit: ONLINE_ORDER_RATE_LIMIT,
      windowMs: ONLINE_ORDER_RATE_WINDOW_MS,
      shopId: shop.id,
      ip,
      alertTitle: "⚠️ มีการสั่งออนไลน์ถี่ผิดปกติ",
      alertBody: `ไอพีหนึ่งสั่งออนไลน์เกิน ${ONLINE_ORDER_RATE_LIMIT} ครั้งใน 5 นาที`,
    });
    if (!guard.allowed) {
      return { error: "สั่งออเดอร์ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
    }

    if (input.paymentMethod === "promptpay_qr" && !shop.promptpayTarget) {
      return { error: "ร้านยังไม่ได้ตั้งค่า PromptPay กรุณาเลือกจ่ายเงินสด" };
    }

    // Prepaid credit (block mode only): no new customer orders once the wallet is empty.
    try {
      await container.creditService.assertCanTakeOrder(shop.id);
    } catch (e) {
      return { error: (e as Error).message };
    }

    // Branch QR scanned on this device (signed cookie) → that branch; else main.
    const branchId = await getOrderBranchId(input.slug, shop.id);
    const order = await new PlaceOrderUseCase(
      container.orderRepository,
      container.menuItemRepository,
      container.customerRepository,
      container.shopRepository,
      container.menuOptionRepository,
      container.platformSettingsRepository,
      container.branchRepository,
    ).execute({
      branchId,
      shopId: shop.id,
      paymentMethod: input.paymentMethod,
      note: input.note ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      channel: "online",
      performedBy: null,
      fulfillmentType: input.fulfillmentType,
      deliveryAddress: input.deliveryAddress ?? null,
      deliveryLat: typeof input.deliveryLat === "number" ? input.deliveryLat : null,
      deliveryLng: typeof input.deliveryLng === "number" ? input.deliveryLng : null,
      deliveryLandmark: input.deliveryLandmark ?? null,
      cart: sanitizeCart(input.cart),
    });

    await container.notificationService.notifyShopOwner(shop.id, {
      type: "new_order",
      title: `ออเดอร์ออนไลน์ใหม่ #${order.orderNo}`,
      body: `มีออเดอร์ใหม่ ${order.items.length} รายการ รวม ${(order.totalSatang / 100).toFixed(2)} บาท`,
      linkUrl: "/shop/orders",
    });

    // Customer account linking (shop setting): remember this device for the
    // customer the order was attached to. Fail-soft — never fails the order.
    let linked = false;
    try {
      const link = await new LinkOrderCustomerDeviceUseCase(
        container.customerDeviceRepository,
      ).execute({
        shopId: shop.id,
        mode: shop.customerLinkMode,
        customerId: order.customerId ?? null,
        consent: input.linkConsent === true,
        currentToken: await getMemberToken(shop.slug),
      });
      if (link) await setMemberCookie(shop.slug, link.token);
      linked =
        !!order.customerId &&
        shop.customerLinkMode !== "off" &&
        (shop.customerLinkMode !== "confirm" || input.linkConsent === true);
    } catch {
      /* ignore — linking is a convenience */
    }

    const res = await buildOrderResult(shop.id, order, input.customerPhone ?? null);
    return {
      ...res,
      // Already remembered → the "scan to view history" QR is redundant.
      bindQrDataUrl: linked ? undefined : res.bindQrDataUrl,
      shopSlug: shop.slug,
      fulfillmentType: input.fulfillmentType,
      linked,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Self-service settlement from the KIOSK: the customer self-paid and tapped
 * "ชำระเงินแล้ว". Marks the order paid + completed in one step. The shop is
 * derived from the server-validated kiosk session (never client input), and
 * this is allowed ONLY when the shop is in self-service mode — so a staffed
 * shop's orders can never be self-marked-paid from the device. Rate-limited.
 */
export async function selfConfirmOrderAction(
  orderId: string,
): Promise<{ ok?: true; orderNo?: number; error?: string }> {
  try {
    const shopId = await requireKioskShop();
    const shop = await container.shopRepository.findById(shopId);
    if (!shop?.selfService) {
      return { error: "ร้านนี้ไม่ได้เปิดโหมดบริการตัวเอง" };
    }

    const ip = await getClientIp();
    const guard = await container.sensitiveActionGuard.check({
      key: `order_selfpay:${shopId}:${ip}`,
      limit: SELF_PAY_RATE_LIMIT,
      windowMs: SELF_PAY_RATE_WINDOW_MS,
      shopId,
      ip,
      alertTitle: "⚠️ มีการกดยืนยันจ่ายเงินถี่ผิดปกติ",
      alertBody: `อุปกรณ์หนึ่งกดยืนยันจ่ายเงินเกิน ${SELF_PAY_RATE_LIMIT} ครั้งใน 5 นาที`,
    });
    if (!guard.allowed) {
      return { error: "กดยืนยันถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
    }

    const order = await new SelfServeCompleteOrderUseCase(
      container.orderRepository,
      new EarnPointsFromOrderUseCase(
        container.shopRepository,
        container.loyaltyPointsSettingsRepository,
        container.loyaltyPointsBalanceRepository,
        container.loyaltyPointsTransactionRepository,
      ),
    ).execute(shopId, orderId);
    await grantWheelTicketsSafe(order);
    revalidatePath("/shop/orders");
    return { ok: true, orderNo: order.orderNo };
  } catch (e) {
    return { error: (e as Error).message };
  }
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
    const { actor, shopId, branchId: staffBranchId } = await operatorContext();
    await assertShopActive(shopId);

    // Walk-in branch: staff → always their own branch; owner → picked branch
    // (must belong to this shop), else main branch.
    const requested = typeof input.branchId === "string" ? input.branchId.trim() : "";
    let branchId: string | null = null;
    if (actor.role === "branch_staff") {
      if (requested && requested !== staffBranchId) {
        return { error: "พนักงานเปิดออเดอร์ได้เฉพาะสาขาของตัวเอง" };
      }
      branchId = staffBranchId;
    } else if (requested) {
      const b = await container.branchRepository.findById(requested);
      if (!b || b.shopId !== shopId) return { error: "ไม่พบสาขาในร้านนี้" };
      if (!b.isActive) return { error: `สาขา "${b.name}" ปิดให้บริการอยู่` };
      branchId = b.id;
      (await cookies()).set(COUNTER_BRANCH_COOKIE, b.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 180 * 24 * 3600,
      });
    }

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
      container.shopRepository,
      container.menuOptionRepository,
      container.platformSettingsRepository,
      container.branchRepository,
    ).execute({
      shopId,
      paymentMethod: input.paymentMethod,
      note: input.note ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      performedBy: actor.id,
      channel: "counter",
      // Staff → their branch; owner/admin → main branch.
      branchId,
      cart: sanitizeCart(input.cart),
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
  reason?: string,
): Promise<{ error?: string }> {
  try {
    const scope = await orderQueueScope();
    const { actor, shopId } = scope;
    await assertOrderInQueueScope(scope, orderId);
    if (to === "cancelled" && !scope.canCancel) {
      throw new Error("ร้านนี้ไม่อนุญาตให้พนักงานสาขายกเลิกออเดอร์ กรุณาแจ้งเจ้าของร้าน");
    }
    const why = typeof reason === "string" ? reason.trim().slice(0, 200) : "";
    const advanced = await new AdvanceOrderStatusUseCase(container.orderRepository).execute(
      shopId,
      orderId,
      to,
    );
    // Lucky wheel: completed → grant tickets; cancelled → revoke unused ones.
    if (to === "cancelled") await revokeWheelTicketsSafe({ id: orderId, shopId });
    else if (to === "completed") await grantWheelTicketsSafe(advanced);
    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: to === "cancelled" ? AUDIT_ACTIONS.orderCancelled : AUDIT_ACTIONS.orderStatusChanged,
      targetType: "order",
      targetId: orderId,
      shopId,
      ip: await getClientIp(),
      metadata: to === "cancelled" ? { to, reason: why || null } : { to },
    });
    revalidatePath("/shop/orders");
    revalidatePath(`/shop/orders/${orderId}`);
    revalidatePath("/staff");
    revalidatePath("/staff/orders");
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
    const scope = await orderQueueScope();
    const { actor, shopId } = scope;
    await assertOrderInQueueScope(scope, orderId);
    const paidOrder = await new ConfirmOrderPaymentUseCase(
      container.orderRepository,
      new EarnPointsFromOrderUseCase(
        container.shopRepository,
        container.loyaltyPointsSettingsRepository,
        container.loyaltyPointsBalanceRepository,
        container.loyaltyPointsTransactionRepository,
      ),
    ).execute(
      shopId,
      orderId,
    );
    await grantWheelTicketsSafe(paidOrder);
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
    revalidatePath("/staff/orders");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Next page of finished orders (history "load more"). */
export async function loadMoreOrderHistoryAction(
  cursor: string,
  branch?: string | null,
): Promise<Page<QueueOrder>> {
  const scope = await orderQueueScope();
  const { shopId } = scope;
  const page = await container.orderRepository.pageHistoryByShop(
    shopId,
    { cursor },
    queueBranchFilter(scope, branch),
  );
  return { ...page, items: await withCustomerNotes(shopId, page.items) };
}
