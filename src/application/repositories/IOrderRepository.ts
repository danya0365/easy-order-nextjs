import type {
  OrderStatus,
  OrderPaymentMethod,
  OrderChannel,
  FulfillmentType,
  OrderWithItems,
} from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface CreateOrderItemInput {
  menuItemId: string | null;
  nameSnapshot: string;
  unitPriceSatang: number;
  quantity: number;
}

export interface CreateOrderInput {
  shopId: string;
  paymentMethod: OrderPaymentMethod;
  note?: string | null;
  /** Optional customer (walk-ins stay null). name/phone are snapshotted. */
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  /** Operator who placed it from the counter UI; null for kiosk self-serve. */
  performedBy?: string | null;
  /** Origin of the order (defaults to kiosk). */
  channel?: OrderChannel;
  /** How it reaches the customer (defaults to pickup). */
  fulfillmentType?: FulfillmentType;
  /** Drop-off address for delivery orders; null otherwise. */
  deliveryAddress?: string | null;
  /** Delivery charge (satang) the repo adds to the total. */
  deliveryFeeSatang?: number;
  items: CreateOrderItemInput[];
}

export interface IOrderRepository {
  /**
   * Insert an order + its line items. The repo computes line/subtotal/total
   * from the items and assigns the next per-shop daily order number.
   */
  create(input: CreateOrderInput): Promise<OrderWithItems>;
  findById(shopId: string, id: string): Promise<OrderWithItems | null>;
  /** Open orders (pending/preparing/ready) for the live queue — bounded, oldest first. */
  listActiveByShop(shopId: string): Promise<OrderWithItems[]>;
  /** Finished orders (completed/cancelled), newest first, cursor-paginated. */
  pageHistoryByShop(
    shopId: string,
    opts?: PageOpts,
  ): Promise<Page<OrderWithItems>>;
  /** A customer's own orders (any status), newest first — for self-service history. */
  pageByCustomer(
    shopId: string,
    customerId: string,
    opts?: PageOpts,
  ): Promise<Page<OrderWithItems>>;
  /** Move an order to a new status (stamps readyAt/completedAt as appropriate). */
  setStatus(
    shopId: string,
    id: string,
    status: OrderStatus,
  ): Promise<OrderWithItems>;
  /** Mark the order paid (stamps paidAt). */
  markPaid(shopId: string, id: string): Promise<OrderWithItems>;
  /** Total orders ever placed at the shop (all statuses) — for billing thresholds. */
  countByShop(shopId: string): Promise<number>;
  /**
   * Customer order stats for new-member limits: `open` = pending/preparing/ready
   * (not cancelled), `finished` = completed or paid.
   */
  customerOrderStats(
    shopId: string,
    customerId: string,
  ): Promise<{ open: number; finished: number }>;
}
