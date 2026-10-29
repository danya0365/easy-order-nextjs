import type { Customer } from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export type OnlineOrderStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export interface ICustomerRepository {
  /** Resolve a customer by id, scoped to the shop (returns null cross-tenant). */
  findById(shopId: string, id: string): Promise<Customer | null>;
  /**
   * PDPA erasure: strip personal data (phone/name/public code) from this
   * customer while keeping the row so order history aggregates stay intact.
   * The synthetic values are unique per customer so the unique constraints hold.
   */
  anonymize(id: string): Promise<void>;
  findByPhone(shopId: string, phone: string): Promise<Customer | null>;
  /** Resolve a customer from the opaque QR code, scoped to the shop. */
  findByPublicCode(shopId: string, code: string): Promise<Customer | null>;
  /** Find an existing customer for (shop, phone) or create one. */
  findOrCreate(
    shopId: string,
    phone: string,
    displayName?: string | null,
  ): Promise<Customer>;
  listByShop(shopId: string, search?: string): Promise<Customer[]>;
  /** Cursor-paginated, newest first; optional phone/name search. */
  pageByShop(
    shopId: string,
    opts?: PageOpts & { search?: string },
  ): Promise<Page<Customer>>;
  /**
   * Customers awaiting shop approval for online ordering. Requests older than
   * the pending TTL are marked `expired` first and excluded.
   */
  listPendingOnlineOrder(shopId: string): Promise<Customer[]>;
  /** Mark pending requests requested before `cutoffIso` as expired. */
  expireStalePending(shopId: string, cutoffIso: string): Promise<number>;
  /** Count open (pending, requested at/after `cutoffIso`) requests for a shop. */
  countOpenPending(shopId: string, cutoffIso: string): Promise<number>;
  /** Mark membership request as pending (static join register). */
  requestOnlineOrderMembership(
    shopId: string,
    customerId: string,
    nowIso: string,
  ): Promise<Customer | null>;
  /** Approve or reject a pending online-order membership. */
  setOnlineOrderStatus(
    shopId: string,
    customerId: string,
    status: "approved" | "rejected",
    reviewedBy: string,
    nowIso: string,
  ): Promise<Customer | null>;
}
