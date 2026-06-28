import type { Lead } from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";

/** Open leads whose follow-up date has passed — feeds the reminder cron. */
export class ListDueFollowUpsUseCase {
  constructor(private readonly leads: ILeadRepository) {}

  async execute(now: string = new Date().toISOString()): Promise<Lead[]> {
    return this.leads.listDueFollowUps(now);
  }
}
