"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireShopWrite } from "@/src/infrastructure/auth/session";
import { assertShopActive } from "@/src/infrastructure/auth/billing-guard";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { UpdateMenuCategoryUseCase } from "@/src/application/use-cases/menu/UpdateMenuCategoryUseCase";
import { DeleteMenuCategoryUseCase } from "@/src/application/use-cases/menu/DeleteMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { UpdateMenuItemUseCase } from "@/src/application/use-cases/menu/UpdateMenuItemUseCase";
import { DeleteMenuItemUseCase } from "@/src/application/use-cases/menu/DeleteMenuItemUseCase";
import { bahtToSatang } from "@/src/presentation/lib/money";

export interface FormState {
  error?: string;
  success?: string;
}

async function ownerShopId(): Promise<string> {
  const { shopId } = await requireShopWrite();
  await assertShopActive(shopId);
  return shopId;
}

function parsePriceSatang(raw: string): number {
  const baht = Number(raw.trim());
  if (!Number.isFinite(baht) || baht < 0) throw new Error("ราคาไม่ถูกต้อง");
  return bahtToSatang(baht);
}

// --- Categories ---

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const shopId = await ownerShopId();
    await new CreateMenuCategoryUseCase(container.menuCategoryRepository).execute(
      shopId,
      String(formData.get("name") ?? ""),
    );
    revalidatePath("/shop/menu");
    return { success: "เพิ่มหมวดหมู่แล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function renameCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const shopId = await ownerShopId();
    await new UpdateMenuCategoryUseCase(container.menuCategoryRepository).execute(
      shopId,
      String(formData.get("categoryId") ?? ""),
      { name: String(formData.get("name") ?? "") },
    );
    revalidatePath("/shop/menu");
    return { success: "บันทึกแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleCategoryAction(
  categoryId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  try {
    const shopId = await ownerShopId();
    await new UpdateMenuCategoryUseCase(container.menuCategoryRepository).execute(
      shopId,
      categoryId,
      { isActive },
    );
    revalidatePath("/shop/menu");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<{ error?: string }> {
  try {
    const shopId = await ownerShopId();
    await new DeleteMenuCategoryUseCase(container.menuCategoryRepository).execute(
      shopId,
      categoryId,
    );
    revalidatePath("/shop/menu");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// --- Items ---

export async function createItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const shopId = await ownerShopId();
    await new CreateMenuItemUseCase(
      container.menuItemRepository,
      container.menuCategoryRepository,
    ).execute({
      shopId,
      categoryId: String(formData.get("categoryId") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      priceSatang: parsePriceSatang(String(formData.get("priceBaht") ?? "")),
    });
    revalidatePath("/shop/menu");
    return { success: "เพิ่มเมนูแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const shopId = await ownerShopId();
    await new UpdateMenuItemUseCase(
      container.menuItemRepository,
      container.menuCategoryRepository,
    ).execute(shopId, String(formData.get("itemId") ?? ""), {
      categoryId: String(formData.get("categoryId") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      priceSatang: parsePriceSatang(String(formData.get("priceBaht") ?? "")),
    });
    revalidatePath("/shop/menu");
    return { success: "บันทึกเมนูแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleItemAvailableAction(
  itemId: string,
  isAvailable: boolean,
): Promise<{ error?: string }> {
  try {
    const shopId = await ownerShopId();
    await new UpdateMenuItemUseCase(
      container.menuItemRepository,
      container.menuCategoryRepository,
    ).execute(shopId, itemId, { isAvailable });
    revalidatePath("/shop/menu");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteItemAction(
  itemId: string,
): Promise<{ error?: string }> {
  try {
    const shopId = await ownerShopId();
    await new DeleteMenuItemUseCase(container.menuItemRepository).execute(
      shopId,
      itemId,
    );
    revalidatePath("/shop/menu");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
