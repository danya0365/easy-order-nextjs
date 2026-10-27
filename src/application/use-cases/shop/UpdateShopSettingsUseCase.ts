import type { Shop } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";

export interface UpdateSettingsInput {
  name?: string;
  categoryId?: string | null;
  promptpayTarget?: string | null;
  /** Online-order settings (toggles + delivery charge/notes/minimum). */
  onlineOrderingEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  deliveryFeeSatang?: number;
  deliveryNotes?: string | null;
  minOrderSatang?: number | null;
}

/** Update the shop's display name, category, PromptPay target (order QR) and online-order settings. */
export class UpdateShopSettingsUseCase {
  constructor(private readonly shops: IShopRepository) {}

  async execute(shopId: string, input: UpdateSettingsInput): Promise<Shop> {
    const patch: {
      name?: string;
      categoryId?: string | null;
      promptpayTarget?: string | null;
      onlineOrderingEnabled?: boolean;
      pickupEnabled?: boolean;
      deliveryEnabled?: boolean;
      deliveryFeeSatang?: number;
      deliveryNotes?: string | null;
      minOrderSatang?: number | null;
    } = {};

    if (input.categoryId !== undefined) {
      // Empty string from the form select means "no category".
      patch.categoryId = input.categoryId ? input.categoryId : null;
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 80) {
        throw new Error("ชื่อร้านต้องยาว 1–80 ตัวอักษร");
      }
      patch.name = name;
    }

    if (input.promptpayTarget !== undefined) {
      const raw = (input.promptpayTarget ?? "").trim();
      if (raw === "") {
        patch.promptpayTarget = null;
      } else {
        const digits = raw.replace(/[^0-9]/g, "");
        // PromptPay target = mobile (10) / national or tax id (13) / e-wallet (15).
        if (![10, 13, 15].includes(digits.length)) {
          throw new Error("PromptPay ต้องเป็นเบอร์มือถือ เลขบัตรประชาชน หรือเลขภาษี");
        }
        patch.promptpayTarget = digits;
      }
    }

    if (input.onlineOrderingEnabled !== undefined) {
      patch.onlineOrderingEnabled = input.onlineOrderingEnabled;
    }
    if (input.pickupEnabled !== undefined) {
      patch.pickupEnabled = input.pickupEnabled;
    }
    if (input.deliveryEnabled !== undefined) {
      patch.deliveryEnabled = input.deliveryEnabled;
    }
    if (input.deliveryFeeSatang !== undefined) {
      const fee = input.deliveryFeeSatang;
      if (!Number.isInteger(fee) || fee < 0) {
        throw new Error("ค่าจัดส่งต้องเป็นตัวเลขที่ไม่ติดลบ");
      }
      patch.deliveryFeeSatang = fee;
    }
    if (input.deliveryNotes !== undefined) {
      // Empty string from the form means "no notes".
      const notes = (input.deliveryNotes ?? "").trim();
      if (notes.length > 200) throw new Error("หมายเหตุการจัดส่งยาวเกินไป");
      patch.deliveryNotes = notes || null;
    }
    if (input.minOrderSatang !== undefined) {
      // Empty/undefined stays null = no minimum.
      const min = input.minOrderSatang;
      if (min !== null && (!Number.isInteger(min) || min < 0)) {
        throw new Error("ยอดขั้นต่ำต้องเป็นตัวเลขที่ไม่ติดลบ");
      }
      patch.minOrderSatang = min;
    }

    return this.shops.updateSettings(shopId, patch);
  }
}
