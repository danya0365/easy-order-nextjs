import type { Lead, LeadLostReason, LeadStatus } from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";

/** Move a lead through the sales funnel. A "lost" move requires a reason. */
export class SetLeadStatusUseCase {
  constructor(private readonly leads: ILeadRepository) {}

  async execute(
    leadId: string,
    status: LeadStatus,
    lostReason?: LeadLostReason | null,
  ): Promise<Lead> {
    const lead = await this.leads.findById(leadId);
    if (!lead) throw new Error("ไม่พบลีด");

    if (status === "lost" && !lostReason) {
      throw new Error("กรุณาเลือกเหตุผลที่ไม่สำเร็จ");
    }
    if (status === "won" && lead.convertedShopId) {
      // Already a real shop — nothing to change.
      return lead;
    }

    return this.leads.setStatus(leadId, status, lostReason);
  }
}
