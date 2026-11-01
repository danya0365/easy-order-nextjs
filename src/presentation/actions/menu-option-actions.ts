"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import { ManageMenuOptionsUseCase } from "@/src/application/use-cases/menu/MenuOptionUseCases";
import { bahtToSatang } from "@/src/presentation/lib/money";

export interface OptionActionState {
  error?: string;
  success?: string;
}

async function ctx() {
  const { shopId } = await requireShopWrite();
  await assertShopActive(shopId);
  const uc = new ManageMenuOptionsUseCase(
    container.menuOptionRepository,
    container.menuItemRepository,
    container.shopRepository,
    container.platformSettingsRepository,
  );
  return { shopId, uc };
}

function deltaFromBaht(raw: unknown): number {
  const baht = Number(String(raw ?? "0").trim() || "0");
  if (!Number.isFinite(baht)) throw new Error("ราคาเพิ่มไม่ถูกต้อง");
  return bahtToSatang(baht);
}

async function run(fn: () => Promise<unknown>): Promise<OptionActionState> {
  try {
    await fn();
    revalidatePath("/shop/menu");
    return { success: "ok" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface GroupPayload {
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
}

export async function createOptionGroupAction(menuItemId: string, g: GroupPayload) {
  return run(async () => {
    const { shopId, uc } = await ctx();
    await uc.createGroup(shopId, String(menuItemId), g);
  });
}

export async function updateOptionGroupAction(groupId: string, g: GroupPayload) {
  return run(async () => {
    const { shopId, uc } = await ctx();
    await uc.updateGroup(shopId, String(groupId), g);
  });
}

export async function deleteOptionGroupAction(groupId: string) {
  return run(async () => {
    const { shopId, uc } = await ctx();
    await uc.deleteGroup(shopId, String(groupId));
  });
}

export async function addOptionChoiceAction(groupId: string, name: string, priceDeltaBaht: string) {
  return run(async () => {
    const { shopId, uc } = await ctx();
    await uc.addChoice(shopId, String(groupId), { name: String(name), priceDeltaSatang: deltaFromBaht(priceDeltaBaht) });
  });
}

export async function updateOptionChoiceAction(
  groupId: string,
  choiceId: string,
  name: string,
  priceDeltaBaht: string,
  isAvailable: boolean,
) {
  return run(async () => {
    const { shopId, uc } = await ctx();
    await uc.updateChoice(shopId, String(groupId), String(choiceId), {
      name: String(name),
      priceDeltaSatang: deltaFromBaht(priceDeltaBaht),
      isAvailable: !!isAvailable,
    });
  });
}

export async function deleteOptionChoiceAction(groupId: string, choiceId: string) {
  return run(async () => {
    const { shopId, uc } = await ctx();
    await uc.deleteChoice(shopId, String(groupId), String(choiceId));
  });
}
