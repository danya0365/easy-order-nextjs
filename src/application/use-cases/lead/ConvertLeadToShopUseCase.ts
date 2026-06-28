import type { Branch, Shop } from "@/src/domain/entities";
import type { ILeadRepository } from "@/src/application/repositories/ILeadRepository";
import type { ILeadVisitLogRepository } from "@/src/application/repositories/ILeadVisitLogRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import { CreateShopUseCase } from "@/src/application/use-cases/shop/CreateShopUseCase";

export interface ConvertLeadToShopInput {
  leadId: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  pricePerDaySatang?: number;
  performedBy: string;
}

/**
 * Turn a won lead into a real billable shop: create shop + owner + trial
 * subscription + first branch (via CreateShopUseCase, carrying the lead's
 * category), then copy the lead's coordinates/address onto that branch so it
 * appears on the public map immediately. The lead is linked to the new shop and
 * a "converted" visit log is recorded.
 *
 * Note: multiple writes without a wrapping transaction (matches CreateShopUseCase
 * house style); a mid-way failure could leave a shop created but the lead unlinked.
 */
export class ConvertLeadToShopUseCase {
  constructor(
    private readonly leads: ILeadRepository,
    private readonly leadVisitLogs: ILeadVisitLogRepository,
    private readonly shops: IShopRepository,
    private readonly users: IUserRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly hasher: IPasswordHasher,
    private readonly branches: IBranchRepository,
  ) {}

  async execute(
    input: ConvertLeadToShopInput,
  ): Promise<{ shop: Shop; branch: Branch }> {
    const lead = await this.leads.findById(input.leadId);
    if (!lead) throw new Error("ไม่พบลีด");
    if (lead.convertedShopId) {
      throw new Error("ลีดนี้ถูกแปลงเป็นร้านแล้ว");
    }
    if (lead.status !== "won") {
      throw new Error('ต้องตั้งสถานะลีดเป็น "ปิดการขายได้" ก่อนแปลงเป็นร้าน');
    }

    const { shop, branch } = await new CreateShopUseCase(
      this.shops,
      this.users,
      this.subscriptions,
      this.hasher,
      this.branches,
    ).execute({
      name: lead.name,
      slug: input.slug,
      ownerEmail: input.ownerEmail,
      ownerPassword: input.ownerPassword,
      pricePerDaySatang: input.pricePerDaySatang,
      categoryId: lead.categoryId,
    });

    // Carry the lead's location onto the shop's first branch so the new shop
    // plots on the public map immediately.
    if (lead.latitude !== null && lead.longitude !== null) {
      await this.branches.updateLocation(branch.id, {
        latitude: lead.latitude,
        longitude: lead.longitude,
        address: lead.address,
      });
    }

    await this.leads.markConverted(lead.id, shop.id);
    await this.leadVisitLogs.create({
      leadId: lead.id,
      reaction: "positive",
      statusBefore: lead.status,
      statusAfter: "won",
      note: `แปลงเป็นร้าน "${shop.name}" (/${shop.slug})`,
      performedBy: input.performedBy,
    });

    return { shop, branch };
  }
}
