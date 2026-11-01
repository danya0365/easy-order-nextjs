import type { MenuOptionChoice, MenuOptionGroup } from "@/src/domain/entities";

export interface OptionGroupWrite {
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
}

export interface OptionChoiceWrite {
  name: string;
  priceDeltaSatang: number;
  isAvailable: boolean;
}

/** Menu option groups + choices. Every method is scoped by shopId. */
export interface IMenuOptionRepository {
  /** Groups (with choices) for the given items, sorted. */
  listByItems(shopId: string, menuItemIds: string[]): Promise<MenuOptionGroup[]>;
  findGroup(shopId: string, groupId: string): Promise<MenuOptionGroup | null>;
  countGroups(shopId: string, menuItemId: string): Promise<number>;
  createGroup(shopId: string, menuItemId: string, input: OptionGroupWrite): Promise<MenuOptionGroup>;
  updateGroup(shopId: string, groupId: string, input: OptionGroupWrite): Promise<void>;
  deleteGroup(shopId: string, groupId: string): Promise<void>;
  createChoice(shopId: string, groupId: string, input: OptionChoiceWrite): Promise<MenuOptionChoice>;
  updateChoice(shopId: string, choiceId: string, input: OptionChoiceWrite): Promise<void>;
  deleteChoice(shopId: string, choiceId: string): Promise<void>;
}
