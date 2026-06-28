import type { Lead } from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";
import { validateLatLng, normalizeAddress } from "@/src/domain/services/geo";

export interface UpdateLeadLocationInput {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

/** Sets (or clears) a lead's map pin + address. Pass null lat/lng to remove it. */
export class UpdateLeadLocationUseCase {
  constructor(private readonly leads: ILeadRepository) {}

  async execute(
    leadId: string,
    input: UpdateLeadLocationInput,
  ): Promise<Lead> {
    const lead = await this.leads.findById(leadId);
    if (!lead) throw new Error("ไม่พบลีด");

    validateLatLng(input);
    const address = normalizeAddress(input.address);

    return this.leads.update(leadId, {
      latitude: input.latitude,
      longitude: input.longitude,
      address,
    });
  }
}
