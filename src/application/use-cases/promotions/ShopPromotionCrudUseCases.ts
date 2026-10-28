import type { ShopPromotion } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IShopPromotionRepository } from "@/src/application/repositories/IShopPromotionRepository";
import type { CreateShopPromotionInput, UpdateShopPromotionInput } from "@/src/application/repositories/IShopPromotionRepository";
import { isPromotionsEffective } from "@/src/domain/services/promotions-gates";

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 2000;

function validHttpsUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (!/^https:\/\/\S+$/.test(s)) throw new Error("ลิงก์รูปภาพต้องเป็น https://");
  return s;
}

function requireModule(shopId: string, shops: IShopRepository): Promise<void> {
  return shops.findById(shopId).then((shop) => {
    if (!shop) throw new Error("ไม่พบร้านค้า");
    if (!shop.promotionsAllowedByAdmin) {
      throw new Error("แอดมินยังไม่อนุญาตให้ร้านนี้ใช้โมดูลโปรโมชัน");
    }
    if (!isPromotionsEffective(shop)) {
      throw new Error("ร้านยังไม่ได้เปิดโมดูลโปรโมชัน (เปิดได้ที่การตั้งค่า)");
    }
  });
}

/** Create a promotion banner for the shop's customer page. */
export class CreateShopPromotionUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly promotions: IShopPromotionRepository,
  ) {}

  async execute(input: CreateShopPromotionInput): Promise<ShopPromotion> {
    await requireModule(input.shopId, this.shops);
    if (!input.title.trim()) throw new Error("กรุณาระบุหัวข้อโปรโมชัน");
    if (input.title.length > MAX_TITLE) {
      throw new Error("หัวข้อยาวเกิน 120 ตัวอักษร");
    }
    if ((input.description ?? "").length > MAX_DESCRIPTION) {
      throw new Error("คำอธิบายยาวเกิน 2000 ตัวอักษร");
    }
    return this.promotions.create({
      ...input,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      imageUrl: validHttpsUrl(input.imageUrl),
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    });
  }
}

/** Edit an existing promotion (title/description/image/window/sort order). */
export class UpdateShopPromotionUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly promotions: IShopPromotionRepository,
  ) {}

  async execute(
    shopId: string,
    promotionId: string,
    input: UpdateShopPromotionInput,
  ): Promise<ShopPromotion> {
    await requireModule(shopId, this.shops);
    const promo = await this.promotions.findById(promotionId);
    if (!promo || promo.shopId !== shopId) {
      throw new Error("ไม่พบโปรโมชันในร้านนี้");
    }
    if (input.title !== undefined) {
      if (!input.title.trim()) throw new Error("กรุณาระบุหัวข้อโปรโมชัน");
      if (input.title.length > MAX_TITLE) {
        throw new Error("หัวข้อยาวเกิน 120 ตัวอักษร");
      }
    }
    if ((input.description ?? "").length > MAX_DESCRIPTION) {
      throw new Error("คำอธิบายยาวเกิน 2000 ตัวอักษร");
    }
    return this.promotions.update(promotionId, {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() ?? null }
        : {}),
      ...(input.imageUrl !== undefined
        ? { imageUrl: validHttpsUrl(input.imageUrl) }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
    });
  }
}

/** Activate/deactivate — hidden from customers when inactive. */
export class SetShopPromotionActiveUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly promotions: IShopPromotionRepository,
  ) {}

  async execute(
    shopId: string,
    promotionId: string,
    isActive: boolean,
  ): Promise<ShopPromotion> {
    await requireModule(shopId, this.shops);
    const promo = await this.promotions.findById(promotionId);
    if (!promo || promo.shopId !== shopId) {
      throw new Error("ไม่พบโปรโมชันในร้านนี้");
    }
    return this.promotions.setActive(promotionId, isActive);
  }
}

export class DeleteShopPromotionUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly promotions: IShopPromotionRepository,
  ) {}

  async execute(shopId: string, promotionId: string): Promise<void> {
    await requireModule(shopId, this.shops);
    const promo = await this.promotions.findById(promotionId);
    if (!promo || promo.shopId !== shopId) {
      throw new Error("ไม่พบโปรโมชันในร้านนี้");
    }
    await this.promotions.delete(promotionId);
  }
}
