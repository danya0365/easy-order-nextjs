import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

/** Check a typed kiosk PIN against the shop's stored hash (for exiting kiosk mode). */
export class VerifyKioskPinUseCase {
  constructor(
    private readonly shops: IShopRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(shopId: string, pin: string): Promise<boolean> {
    const hash = await this.shops.getKioskPinHash(shopId);
    if (!hash) return false;
    return this.hasher.compare(pin, hash);
  }
}
