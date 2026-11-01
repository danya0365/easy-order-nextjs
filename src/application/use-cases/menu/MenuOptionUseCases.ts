import type { MenuOptionGroup } from "@/src/domain/entities";
import type { IMenuOptionRepository } from "@/src/application/repositories/IMenuOptionRepository";
import type { IMenuItemRepository } from "@/src/application/repositories/IMenuItemRepository";
import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { IPlatformSettingsRepository } from "@/src/application/repositories/IPlatformSettingsRepository";
import {
  MAX_CHOICES_PER_GROUP,
  MAX_GROUPS_PER_ITEM,
  menuOptionsEffective,
  normalizeOptionGroupConfig,
  normalizeOptionName,
  normalizePriceDelta,
  type OptionGroupConfigInput,
} from "@/src/domain/services/menu-options";

/** Is the menu-options feature effective for this shop (platform && admin per-shop)? */
export async function isMenuOptionsEnabledForShop(
  settings: IPlatformSettingsRepository,
  shops: IShopRepository,
  shopId: string,
): Promise<boolean> {
  const [s, shop] = await Promise.all([settings.get(), shops.findById(shopId)]);
  return !!shop && menuOptionsEffective(s.menuOptionsEnabled, shop.menuOptionsAllowedByAdmin);
}

export interface ChoiceInput {
  name: string;
  priceDeltaSatang: number;
  isAvailable?: boolean;
}

/**
 * Owner-side management of option groups/choices. Every write checks the
 * feature is effective for the shop and that the target belongs to the shop.
 */
export class ManageMenuOptionsUseCase {
  constructor(
    private readonly options: IMenuOptionRepository,
    private readonly items: IMenuItemRepository,
    private readonly shops: IShopRepository,
    private readonly settings: IPlatformSettingsRepository,
  ) {}

  private async assertEnabled(shopId: string) {
    if (!(await isMenuOptionsEnabledForShop(this.settings, this.shops, shopId))) {
      throw new Error("ฟีเจอร์ตัวเลือกเมนูยังไม่เปิดสำหรับร้านนี้");
    }
  }

  private async groupOf(shopId: string, groupId: string): Promise<MenuOptionGroup> {
    const g = await this.options.findGroup(shopId, groupId);
    if (!g) throw new Error("ไม่พบกลุ่มตัวเลือก");
    return g;
  }

  async listForItem(shopId: string, menuItemId: string): Promise<MenuOptionGroup[]> {
    return this.options.listByItems(shopId, [menuItemId]);
  }

  async createGroup(shopId: string, menuItemId: string, input: OptionGroupConfigInput) {
    await this.assertEnabled(shopId);
    const item = await this.items.findById(menuItemId);
    if (!item || item.shopId !== shopId) throw new Error("ไม่พบเมนู");
    if ((await this.options.countGroups(shopId, menuItemId)) >= MAX_GROUPS_PER_ITEM) {
      throw new Error(`เพิ่มกลุ่มตัวเลือกได้ไม่เกิน ${MAX_GROUPS_PER_ITEM} กลุ่มต่อเมนู`);
    }
    return this.options.createGroup(shopId, menuItemId, normalizeOptionGroupConfig(input));
  }

  async updateGroup(shopId: string, groupId: string, input: OptionGroupConfigInput) {
    await this.assertEnabled(shopId);
    await this.groupOf(shopId, groupId);
    await this.options.updateGroup(shopId, groupId, normalizeOptionGroupConfig(input));
  }

  async deleteGroup(shopId: string, groupId: string) {
    await this.assertEnabled(shopId);
    await this.groupOf(shopId, groupId);
    await this.options.deleteGroup(shopId, groupId);
  }

  async addChoice(shopId: string, groupId: string, input: ChoiceInput) {
    await this.assertEnabled(shopId);
    const g = await this.groupOf(shopId, groupId);
    if (g.choices.length >= MAX_CHOICES_PER_GROUP) {
      throw new Error(`เพิ่มตัวเลือกได้ไม่เกิน ${MAX_CHOICES_PER_GROUP} รายการต่อกลุ่ม`);
    }
    return this.options.createChoice(shopId, groupId, {
      name: normalizeOptionName(input.name),
      priceDeltaSatang: normalizePriceDelta(input.priceDeltaSatang),
      isAvailable: input.isAvailable ?? true,
    });
  }

  async updateChoice(shopId: string, groupId: string, choiceId: string, input: ChoiceInput) {
    await this.assertEnabled(shopId);
    const g = await this.groupOf(shopId, groupId);
    if (!g.choices.some((c) => c.id === choiceId)) throw new Error("ไม่พบตัวเลือก");
    await this.options.updateChoice(shopId, choiceId, {
      name: normalizeOptionName(input.name),
      priceDeltaSatang: normalizePriceDelta(input.priceDeltaSatang),
      isAvailable: input.isAvailable ?? true,
    });
  }

  async deleteChoice(shopId: string, groupId: string, choiceId: string) {
    await this.assertEnabled(shopId);
    const g = await this.groupOf(shopId, groupId);
    if (!g.choices.some((c) => c.id === choiceId)) throw new Error("ไม่พบตัวเลือก");
    await this.options.deleteChoice(shopId, choiceId);
  }
}

/** Data the customer ordering UIs need: option groups (when effective) + item-detail switch. */
export async function loadOrderingExtras(
  settings: IPlatformSettingsRepository,
  options: IMenuOptionRepository,
  shop: { id: string; menuOptionsAllowedByAdmin: boolean },
  menuItemIds: string[],
): Promise<{ optionGroups: MenuOptionGroup[] | null; itemDetailEnabled: boolean }> {
  const s = await settings.get();
  const on = menuOptionsEffective(s.menuOptionsEnabled, shop.menuOptionsAllowedByAdmin);
  const optionGroups =
    on && menuItemIds.length ? await options.listByItems(shop.id, menuItemIds) : null;
  return { optionGroups, itemDetailEnabled: s.itemDetailEnabled };
}
