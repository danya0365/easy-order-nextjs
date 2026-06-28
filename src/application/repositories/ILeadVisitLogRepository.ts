import type { LeadStatus, LeadVisitLog, LeadVisitReaction } from "@/src/domain/entities";
import type { Page, PageOpts } from "./pagination";

export interface CreateLeadVisitLogInput {
  leadId: string;
  reaction: LeadVisitReaction;
  statusBefore?: LeadStatus | null;
  statusAfter?: LeadStatus | null;
  note?: string | null;
  performedBy: string;
}

export interface ILeadVisitLogRepository {
  create(input: CreateLeadVisitLogInput): Promise<LeadVisitLog>;
  /** Newest-first, capped — for the lead detail timeline. */
  listByLead(leadId: string, limit?: number): Promise<LeadVisitLog[]>;
  /** Keyset page newest-first for one lead. */
  pageByLead(leadId: string, opts?: PageOpts): Promise<Page<LeadVisitLog>>;
}
