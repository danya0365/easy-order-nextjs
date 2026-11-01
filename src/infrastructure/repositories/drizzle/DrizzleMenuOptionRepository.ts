import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { MenuOptionChoice, MenuOptionGroup } from "@/src/domain/entities";
import type {
  IMenuOptionRepository,
  OptionChoiceWrite,
  OptionGroupWrite,
} from "@/src/application/repositories/IMenuOptionRepository";

type GroupRow = typeof schema.menuOptionGroups.$inferSelect;
type ChoiceRow = typeof schema.menuOptionChoices.$inferSelect;

function toChoice(r: ChoiceRow): MenuOptionChoice {
  return {
    id: r.id,
    groupId: r.groupId,
    name: r.name,
    priceDeltaSatang: r.priceDeltaSatang,
    isAvailable: r.isAvailable,
    sortOrder: r.sortOrder,
  };
}

function toGroup(r: GroupRow, choices: MenuOptionChoice[]): MenuOptionGroup {
  return {
    id: r.id,
    shopId: r.shopId,
    menuItemId: r.menuItemId,
    name: r.name,
    isRequired: r.isRequired,
    minSelect: r.minSelect,
    maxSelect: r.maxSelect,
    sortOrder: r.sortOrder,
    choices,
  };
}

export class DrizzleMenuOptionRepository implements IMenuOptionRepository {
  private async withChoices(shopId: string, rows: GroupRow[]): Promise<MenuOptionGroup[]> {
    if (rows.length === 0) return [];
    const choices = await db
      .select()
      .from(schema.menuOptionChoices)
      .where(
        and(
          eq(schema.menuOptionChoices.shopId, shopId),
          inArray(schema.menuOptionChoices.groupId, rows.map((r) => r.id)),
        ),
      )
      .orderBy(asc(schema.menuOptionChoices.sortOrder), asc(schema.menuOptionChoices.createdAt));
    const byGroup = new Map<string, MenuOptionChoice[]>();
    for (const c of choices) {
      const list = byGroup.get(c.groupId) ?? [];
      list.push(toChoice(c));
      byGroup.set(c.groupId, list);
    }
    return rows.map((r) => toGroup(r, byGroup.get(r.id) ?? []));
  }

  async listByItems(shopId: string, menuItemIds: string[]): Promise<MenuOptionGroup[]> {
    if (menuItemIds.length === 0) return [];
    const rows = await db
      .select()
      .from(schema.menuOptionGroups)
      .where(
        and(
          eq(schema.menuOptionGroups.shopId, shopId),
          inArray(schema.menuOptionGroups.menuItemId, menuItemIds),
        ),
      )
      .orderBy(asc(schema.menuOptionGroups.sortOrder), asc(schema.menuOptionGroups.createdAt));
    return this.withChoices(shopId, rows);
  }

  async findGroup(shopId: string, groupId: string): Promise<MenuOptionGroup | null> {
    const rows = await db
      .select()
      .from(schema.menuOptionGroups)
      .where(and(eq(schema.menuOptionGroups.shopId, shopId), eq(schema.menuOptionGroups.id, groupId)));
    const [g] = await this.withChoices(shopId, rows);
    return g ?? null;
  }

  async countGroups(shopId: string, menuItemId: string): Promise<number> {
    const [r] = await db
      .select({ n: count() })
      .from(schema.menuOptionGroups)
      .where(and(eq(schema.menuOptionGroups.shopId, shopId), eq(schema.menuOptionGroups.menuItemId, menuItemId)));
    return r?.n ?? 0;
  }

  async createGroup(shopId: string, menuItemId: string, input: OptionGroupWrite): Promise<MenuOptionGroup> {
    const n = await this.countGroups(shopId, menuItemId);
    const [r] = await db
      .insert(schema.menuOptionGroups)
      .values({ shopId, menuItemId, ...input, sortOrder: n })
      .returning();
    return toGroup(r, []);
  }

  async updateGroup(shopId: string, groupId: string, input: OptionGroupWrite): Promise<void> {
    await db
      .update(schema.menuOptionGroups)
      .set(input)
      .where(and(eq(schema.menuOptionGroups.shopId, shopId), eq(schema.menuOptionGroups.id, groupId)));
  }

  async deleteGroup(shopId: string, groupId: string): Promise<void> {
    await db
      .delete(schema.menuOptionGroups)
      .where(and(eq(schema.menuOptionGroups.shopId, shopId), eq(schema.menuOptionGroups.id, groupId)));
  }

  async createChoice(shopId: string, groupId: string, input: OptionChoiceWrite): Promise<MenuOptionChoice> {
    const [{ n }] = await db
      .select({ n: count() })
      .from(schema.menuOptionChoices)
      .where(and(eq(schema.menuOptionChoices.shopId, shopId), eq(schema.menuOptionChoices.groupId, groupId)));
    const [r] = await db
      .insert(schema.menuOptionChoices)
      .values({ shopId, groupId, ...input, sortOrder: n })
      .returning();
    return toChoice(r);
  }

  async updateChoice(shopId: string, choiceId: string, input: OptionChoiceWrite): Promise<void> {
    await db
      .update(schema.menuOptionChoices)
      .set(input)
      .where(and(eq(schema.menuOptionChoices.shopId, shopId), eq(schema.menuOptionChoices.id, choiceId)));
  }

  async deleteChoice(shopId: string, choiceId: string): Promise<void> {
    await db
      .delete(schema.menuOptionChoices)
      .where(and(eq(schema.menuOptionChoices.shopId, shopId), eq(schema.menuOptionChoices.id, choiceId)));
  }
}
