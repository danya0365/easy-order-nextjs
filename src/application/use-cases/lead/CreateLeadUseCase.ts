import type { Lead } from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";
import type { IShopCategoryRepository } from "@/src/application/repositories/IShopCategoryRepository";
import { validateLatLng, normalizeAddress } from "@/src/domain/services/geo";

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

/** Add a prospect shop the operator wants to survey in the field. */
export class CreateLeadUseCase {
  constructor(
    private readonly leads: ILeadRepository,
    private readonly categories: IShopCategoryRepository,
  ) {}

  async execute(input: CreateLeadInput): Promise<Lead> {
    const name = input.name.trim();
    if (name.length < 1) throw new Error("กรุณาระบุชื่อร้าน");

    const latitude = input.latitude ?? null;
    const longitude = input.longitude ?? null;
    validateLatLng({ latitude, longitude });
    const address = normalizeAddress(input.address);

    let categoryId: string | null = null;
    if (input.categoryId) {
      const category = await this.categories.findById(input.categoryId);
      if (!category) throw new Error("ไม่พบหมวดหมู่ร้านที่เลือก");
      categoryId = category.id;
    }

    return this.leads.create({
      name,
      categoryId,
      address,
      phone: input.phone?.trim() || null,
      latitude,
      longitude,
      notes: input.notes?.trim() || null,
      nextFollowUpAt: input.nextFollowUpAt || null,
      createdBy: input.createdBy ?? null,
    });
  }
}
