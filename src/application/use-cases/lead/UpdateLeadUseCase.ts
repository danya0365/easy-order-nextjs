import type { Lead } from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";
import type { IShopCategoryRepository } from "@/src/application/repositories/IShopCategoryRepository";

export interface UpdateLeadInput {
  name?: string;
  categoryId?: string | null;
  phone?: string | null;
  notes?: string | null;
  nextFollowUpAt?: string | null;
}

/** Edit a lead's profile fields (location is handled separately by the map editor). */
export class UpdateLeadUseCase {
  constructor(
    private readonly leads: ILeadRepository,
    private readonly categories: IShopCategoryRepository,
  ) {}

  async execute(id: string, input: UpdateLeadInput): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new Error("ไม่พบลีด");

    let categoryId: string | null | undefined;
    if (input.categoryId !== undefined) {
      categoryId = null;
      if (input.categoryId) {
        const category = await this.categories.findById(input.categoryId);
        if (!category) throw new Error("ไม่พบหมวดหมู่ร้านที่เลือก");
        categoryId = category.id;
      }
    }

    return this.leads.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(input.phone !== undefined
        ? { phone: input.phone?.trim() || null }
        : {}),
      ...(input.notes !== undefined
        ? { notes: input.notes?.trim() || null }
        : {}),
      ...(input.nextFollowUpAt !== undefined
        ? { nextFollowUpAt: input.nextFollowUpAt || null }
        : {}),
    });
  }
}
