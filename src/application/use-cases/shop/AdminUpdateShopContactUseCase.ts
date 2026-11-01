import type { IShopProfileRepository } from "@/src/application/repositories/IShopProfileRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import {
  normalizeFacebookUrl,
  normalizeLineContact,
  normalizePromptPayTarget,
  normalizeShopPhone,
} from "@/src/domain/services/shop-contact";

export interface AdminShopContactInput {
  phone?: string | null;
  promptpayTarget?: string | null;
  line?: string | null;
  facebookUrl?: string | null;
}

/**
 * Platform admin sets a shop's public contact + PromptPay. Validates every
 * field first (all-or-nothing), then patches only these fields — other profile
 * fields (about, hours, instagram, website) are preserved.
 */
export class AdminUpdateShopContactUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly profiles: IShopProfileRepository,
  ) {}

  async execute(shopId: string, input: AdminShopContactInput) {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    const phone = normalizeShopPhone(input.phone);
    const promptpayTarget = normalizePromptPayTarget(input.promptpayTarget);
    const lineUrl = normalizeLineContact(input.line);
    const facebookUrl = normalizeFacebookUrl(input.facebookUrl);

    const cur = await this.profiles.get(shopId);
    await this.profiles.upsert(shopId, {
      description: cur?.description ?? null,
      openingHours: cur?.openingHours ?? null,
      instagramUrl: cur?.instagramUrl ?? null,
      websiteUrl: cur?.websiteUrl ?? null,
      phone,
      lineUrl,
      facebookUrl,
    });
    await this.shops.updateSettings(shopId, { promptpayTarget });
    return { phone, promptpayTarget, lineUrl, facebookUrl };
  }
}
