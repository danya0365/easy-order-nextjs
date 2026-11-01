import { nanoid } from "nanoid";

import type { IDemoDataRepository, DemoDataCounts } from "@/src/application/repositories/IDemoDataRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import { buildDemoDataPlan } from "@/src/domain/services/demo-data";

/** Admin-only: seed / clear clearly-labelled demo data for one shop. */
export class DemoDataUseCase {
  constructor(
    private readonly demo: IDemoDataRepository,
    private readonly items: IMenuItemRepository,
    private readonly shops: IShopRepository,
  ) {}

  async seed(
    shopId: string,
    opts: { orders: number; customers: number; riders: number },
    now = new Date(),
  ): Promise<DemoDataCounts & { batchId: string }> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้าน");
    const menu = (await this.items.listByShop(shopId))
      .filter((i) => i.isAvailable)
      .map((i) => ({ id: i.id, name: i.name, priceSatang: i.priceSatang }));
    const plan = buildDemoDataPlan(menu, { ...opts, now });
    const batchId = nanoid();
    const counts = await this.demo.insertPlan(shopId, plan, batchId);
    return { ...counts, batchId };
  }

  clear(shopId: string): Promise<DemoDataCounts> {
    return this.demo.clear(shopId);
  }

  counts(shopId: string): Promise<DemoDataCounts> {
    return this.demo.counts(shopId);
  }
}
