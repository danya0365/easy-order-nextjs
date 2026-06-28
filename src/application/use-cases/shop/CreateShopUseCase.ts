import type { Branch, Shop } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import { DEFAULT_PRICE_PER_DAY_SATANG } from "@/src/domain/services/topup-pricing";

/** New shops get a free trial before their first top-up is required. */
const TRIAL_DAYS = 30;

/** Name of the first branch every shop is created with (location set later). */
export const DEFAULT_BRANCH_NAME = "สาขาหลัก";

export interface CreateShopInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  pricePerDaySatang?: number;
  promptpayTarget?: string | null;
  /** Optional shop category (e.g. carried over when converting a lead). */
  categoryId?: string | null;
}

/**
 * Onboard a new tenant: shop + owner account + 30-day trial subscription + a
 * first branch ("สาขาหลัก", location unset). The branch is created here so every
 * entry point gets one — without it, staff can't be added.
 */
export class CreateShopUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly users: IUserRepository,
    private readonly subscriptions: ISubscriptionRepository,
    private readonly hasher: IPasswordHasher,
    private readonly branches: IBranchRepository,
  ) {}

  async execute(input: CreateShopInput): Promise<{ shop: Shop; branch: Branch }> {
    const slug = input.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (slug.length < 2) throw new Error("slug ต้องมีอย่างน้อย 2 ตัวอักษร");

    const email = input.ownerEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("อีเมลเจ้าของร้านไม่ถูกต้อง");
    }
    if (input.ownerPassword.length < 6) {
      throw new Error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
    }
    const pricePerDaySatang =
      input.pricePerDaySatang && input.pricePerDaySatang > 0
        ? Math.round(input.pricePerDaySatang)
        : DEFAULT_PRICE_PER_DAY_SATANG;
    if (await this.shops.findBySlug(slug)) {
      throw new Error("slug นี้ถูกใช้แล้ว");
    }
    if (await this.users.findByEmailWithSecret(email)) {
      throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
    }

    const shop = await this.shops.create({
      name: input.name.trim(),
      slug,
      categoryId: input.categoryId ?? null,
      promptpayTarget: input.promptpayTarget ?? null,
    });

    const now = Date.now();
    await this.subscriptions.create({
      shopId: shop.id,
      pricePerDaySatang,
      status: "trialing",
      currentPeriodStartAt: new Date(now).toISOString(),
      currentPeriodDueAt: new Date(now + TRIAL_DAYS * 864e5).toISOString(),
    });

    const passwordHash = await this.hasher.hash(input.ownerPassword);
    await this.users.create({
      email,
      passwordHash,
      role: "shop_owner",
      shopId: shop.id,
      branchId: null,
    });

    // First branch (no coordinates yet — set later from /shop/branches).
    const branch = await this.branches.create({
      shopId: shop.id,
      name: DEFAULT_BRANCH_NAME,
    });

    return { shop, branch };
  }
}
