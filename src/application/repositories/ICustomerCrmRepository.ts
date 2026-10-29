import type { CrmCustomerRow } from "@/src/domain/services/customer-crm";

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
}
