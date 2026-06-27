import type { Shop } from "@/src/domain/entities";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";

export interface UpdateSettingsInput {
  name?: string;
  categoryId?: string | null;
  promptpayTarget?: string | null;
}

/** Update the shop's display name, category, and PromptPay target (order QR). */
export class UpdateShopSettingsUseCase {
  constructor(private readonly shops: IShopRepository) {}

  async execute(shopId: string, input: UpdateSettingsInput): Promise<Shop> {
    const patch: {
      name?: string;
      categoryId?: string | null;
      promptpayTarget?: string | null;
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

    return this.shops.updateSettings(shopId, patch);
  }
}
