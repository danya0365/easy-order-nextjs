import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";

/** Delete a menu item — scoped to the shop. Past orders keep their snapshots. */
export class DeleteMenuItemUseCase {
  constructor(private readonly items: IMenuItemRepository) {}

  async execute(shopId: string, itemId: string): Promise<void> {
    const item = await this.items.findById(itemId);
    if (!item || item.shopId !== shopId) throw new Error("ไม่พบเมนูในร้านนี้");
    await this.items.delete(itemId);
  }
}
