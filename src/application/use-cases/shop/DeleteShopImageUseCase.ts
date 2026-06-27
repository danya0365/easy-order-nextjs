import type { IShopImageRepository } from "@/src/application/repositories/IShopImageRepository";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";

/** Remove a shop image (storage object + row). Scoped to the owning shop. */
export class DeleteShopImageUseCase {
  constructor(
    private readonly images: IShopImageRepository,
    private readonly storage: ISlipStorage,
  ) {}

  async execute(shopId: string, imageId: string): Promise<void> {
    const image = await this.images.findById(imageId);
    if (!image || image.shopId !== shopId) {
      throw new Error("ไม่พบรูปในร้านนี้");
    }
    await this.images.delete(image.id);
    await this.storage.delete(image.storageKey);
  }
}
