import type { CrmCustomerRow } from "@/src/domain/services/customer-crm";

export interface CustomerDetailStats {
  orderCount: number;
  totalSpendSatang: number;
  avgTicketSatang: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  fulfillment: { pickup: number; delivery: number; dine_in: number };
  topItems: { name: string; quantity: number }[];
}

export interface CustomerOrderRow {
  id: string;
  orderNo: number;
  createdAt: string;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  totalSatang: number;
}

export interface PointsLedgerRow {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface CustomerTimelineRow {
  id: string;
  action: string;
  actorUserId: string | null;
  metadata: string | null;
  createdAt: string;
}

/** Shop-scoped CRM reads/writes. Every method takes shopId and never crosses shops. */
export interface ICustomerCrmRepository {
  /** All customers of a shop with order/spend/points aggregates (one query). */
  listWithStats(shopId: string): Promise<CrmCustomerRow[]>;
  /** Customers of this shop among `ids` (bulk ops filter foreign ids out). */
  filterOwnIds(shopId: string, ids: string[]): Promise<string[]>;
  updateProfile(shopId: string, id: string, input: { displayName?: string | null; note?: string | null }): Promise<boolean>;
  setTags(shopId: string, id: string, tags: string[]): Promise<boolean>;
  setBlocked(shopId: string, id: string, by: string | null): Promise<boolean>;
  setNewMemberCleared(shopId: string, id: string, at: string | null): Promise<boolean>;
  /** Notes for the order queue badge. */
  notesFor(shopId: string, customerIds: string[]): Promise<Map<string, string>>;
  detailStats(shopId: string, customerId: string): Promise<CustomerDetailStats>;
  pageOrders(shopId: string, customerId: string, page: number, size: number): Promise<{ items: CustomerOrderRow[]; total: number }>;
  deliveryAddresses(shopId: string, customerId: string, limit?: number): Promise<{ address: string; lastUsedAt: string; count: number }[]>;
  ledger(shopId: string, customerId: string, limit?: number): Promise<PointsLedgerRow[]>;
  /** Atomic signed balance change; returns new balance, or null if it would go below 0. */
  adjustBalance(shopId: string, customerId: string, delta: number): Promise<number | null>;
  timeline(shopId: string, customerId: string, limit?: number): Promise<CustomerTimelineRow[]>;
}
