import type { CrmCustomerRow, CrmOverview, CrmQuery } from "@/src/domain/services/customer-crm";

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
  /** SQL search/filter/sort + LIMIT/OFFSET page. */
  searchPage(shopId: string, query: CrmQuery, opts: { page: number; size: number; now?: number }): Promise<{ items: CrmCustomerRow[]; total: number; page: number; size: number }>;
  /** Ids of every row matching the filter, up to `cap` (overCap when more exist). */
  matchingIds(shopId: string, query: CrmQuery, cap: number, now?: number): Promise<{ ids: string[]; overCap: boolean }>;
  exportRows(shopId: string, query: CrmQuery, opts: { ids?: string[]; cap: number; now?: number }): Promise<{ rows: CrmCustomerRow[]; overCap: boolean }>;
  /** Summary cards + per-tab counts in one aggregate query. */
  overview(shopId: string, now?: number): Promise<CrmOverview>;
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
