import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

/** A kiosk PIN is 4–6 digits — enough to gate exit, easy to type at a counter. */
function assertValidPin(pin: string): void {
  if (!/^[0-9]{4,6}$/.test(pin)) {
    throw new Error("PIN ต้องเป็นตัวเลข 4–6 หลัก");
  }
}

/** Owner sets/changes the kiosk PIN (required to exit kiosk mode on a device). */
export class SetKioskPinUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(shopId: string, pin: string): Promise<void> {
    assertValidPin(pin);
    const hash = await this.hasher.hash(pin);
    await this.shops.updateSettings(shopId, { kioskPinHash: hash });
  }
}
