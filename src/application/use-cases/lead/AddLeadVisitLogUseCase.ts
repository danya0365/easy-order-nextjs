import type {
  Lead,
  LeadStatus,
  LeadVisitLog,
  LeadVisitReaction,
} from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";
import type { ILeadVisitLogRepository } from "@/src/application/repositories/ILeadVisitLogRepository";

export interface AddLeadVisitLogInput {
  leadId: string;
  reaction: LeadVisitReaction;
  note?: string | null;
  performedBy: string;
  /** Explicit status to move to; omitted = apply the default forward step. */
  advanceTo?: LeadStatus;
}

/**
 * Default forward transition applied when the operator doesn't pick a status.
 * Never auto-advances past "interested" — won/lost are deliberate decisions
 * made via the status control or the convert flow.
 */
const DEFAULT_NEXT: Partial<Record<LeadStatus, LeadStatus>> = {
  new: "visited",
};

/** Record a field visit and (optionally) advance the lead's funnel stage. */
export class AddLeadVisitLogUseCase {
  constructor(
    private readonly leads: ILeadRepository,
    private readonly visitLogs: ILeadVisitLogRepository,
  ) {}

  async execute(input: AddLeadVisitLogInput): Promise<LeadVisitLog> {
    const lead = await this.leads.findById(input.leadId);
    if (!lead) throw new Error("ไม่พบลีด");

    const statusBefore = lead.status;
    const statusAfter: LeadStatus =
      input.advanceTo ?? DEFAULT_NEXT[statusBefore] ?? statusBefore;

    // Won/lost stay deliberate; never reached by an auto/visit advance.
    const canAdvance =
      statusAfter !== statusBefore &&
      statusAfter !== "won" &&
      statusAfter !== "lost" &&
      !lead.convertedShopId;

    let appliedAfter: Lead["status"] = statusBefore;
    if (canAdvance) {
      const updated = await this.leads.setStatus(input.leadId, statusAfter);
      appliedAfter = updated.status;
    }

    return this.visitLogs.create({
      leadId: input.leadId,
      reaction: input.reaction,
      statusBefore,
      statusAfter: appliedAfter,
      note: input.note?.trim() || null,
      performedBy: input.performedBy,
    });
  }
}
