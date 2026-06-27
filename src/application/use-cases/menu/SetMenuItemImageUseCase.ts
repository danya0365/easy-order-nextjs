import type { MenuItem } from "@/src/domain/entities";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";
import { extForContentType, menuImageKey } from "@/src/application/services/slip-media";
import { isSupportedImage } from "@/src/domain/services/image-signature";

const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic"];

export interface SetMenuItemImageInput {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

/**
 * Attach (or replace) a menu item's image: validate the bytes, store them in
 * object storage under `menu/{itemId}.{ext}`, and persist the key on the item.
 * Scoped to the owning shop. Replacing a different key best-effort deletes the
 * old blob; the orphaned-files cron is the safety net for anything missed.
 */
export class SetMenuItemImageUseCase {
  constructor(
    private readonly items: IMenuItemRepository,
    private readonly storage: ISlipStorage,
  ) {}

  async execute(
    shopId: string,
    itemId: string,
    input: SetMenuItemImageInput,
  ): Promise<MenuItem> {
    const item = await this.items.findById(itemId);
    if (!item || item.shopId !== shopId) {
      throw new Error("ไม่พบเมนูในร้านนี้");
    }
    if (!ALLOWED_TYPES.includes(input.contentType)) {
      throw new Error("รองรับเฉพาะรูปภาพ (PNG/JPG/WEBP)");
    }
    if (input.bytes.byteLength === 0) throw new Error("ไม่พบไฟล์รูป");
    if (input.bytes.byteLength > MAX_MENU_IMAGE_BYTES) {
      throw new Error("ไฟล์ใหญ่เกิน 5MB");
    }
    if (!isSupportedImage(input.bytes)) {
      throw new Error("ไฟล์ไม่ใช่รูปภาพที่รองรับ (PNG/JPG/WEBP/HEIC)");
    }

    const oldKey = item.imageUrl;
    const key = menuImageKey(
      itemId,
      extForContentType(input.contentType, input.filename),
    );
    await this.storage.saveObject({
      key,
      contentType: input.contentType,
      bytes: input.bytes,
    });

    const updated = await this.items.update(itemId, { imageUrl: key });

    // Replaced a differently-named blob (e.g. ext changed) → reclaim the old one.
    if (oldKey && oldKey !== key) {
      await this.storage.delete(oldKey);
    }
    return updated;
  }

  async remove(shopId: string, itemId: string): Promise<MenuItem> {
    const item = await this.items.findById(itemId);
    if (!item || item.shopId !== shopId) {
      throw new Error("ไม่พบเมนูในร้านนี้");
    }
    const oldKey = item.imageUrl;
    const updated = await this.items.update(itemId, { imageUrl: null });
    if (oldKey) await this.storage.delete(oldKey);
    return updated;
  }
}
