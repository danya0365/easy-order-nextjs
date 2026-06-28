import type {
  Lead,
  LeadLostReason,
  LeadMapLocation,
  LeadStatus,
} from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface CreateLeadInput {
  name: string;
  categoryId?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  nextFollowUpAt?: string | null;
  createdBy?: string | null;
}

/** Partial update — undefined fields are left unchanged. */
export interface UpdateLeadInput {
  name?: string;
  categoryId?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  nextFollowUpAt?: string | null;
}

export interface ListLeadsOpts extends PageOpts {
  /** Filter by funnel stage; null/undefined returns all leads. */
  status?: LeadStatus | null;
}

export interface ILeadRepository {
  create(input: CreateLeadInput): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  /** Keyset page newest-first, optionally filtered by status. */
  page(opts?: ListLeadsOpts): Promise<Page<Lead>>;
  update(id: string, input: UpdateLeadInput): Promise<Lead>;
  setStatus(
    id: string,
    status: LeadStatus,
    lostReason?: LeadLostReason | null,
  ): Promise<Lead>;
  setPhoto(id: string, photoUrl: string): Promise<Lead>;
  /** Sets convertedShopId + convertedAt and forces status = "won". */
  markConverted(id: string, shopId: string): Promise<Lead>;
  /** Leads with coordinates that have not been converted — for the admin map. */
  listMapLocations(): Promise<LeadMapLocation[]>;
  /**
   * Open leads whose follow-up date has passed and have not yet been announced
   * for that due date — for the reminder cron. Idempotent across cron runs.
   */
  listDueFollowUps(now: string): Promise<Lead[]>;
  /** Stamp `followUpNotifiedAt = at` on the given leads (after reminding). */
  markFollowUpsNotified(ids: string[], at: string): Promise<void>;
  /** Every non-null lead photo storage key — for orphaned-file cleanup. */
  allPhotoKeys(): Promise<string[]>;
}
