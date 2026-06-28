"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireRole } from "@/src/infrastructure/auth/session";
import { CreateLeadUseCase } from "@/src/application/use-cases/lead/CreateLeadUseCase";
import { UpdateLeadUseCase } from "@/src/application/use-cases/lead/UpdateLeadUseCase";
import { UpdateLeadLocationUseCase } from "@/src/application/use-cases/lead/UpdateLeadLocationUseCase";
import { SetLeadStatusUseCase } from "@/src/application/use-cases/lead/SetLeadStatusUseCase";
import { AddLeadVisitLogUseCase } from "@/src/application/use-cases/lead/AddLeadVisitLogUseCase";
import { SaveLeadPhotoUseCase } from "@/src/application/use-cases/lead/SaveLeadPhotoUseCase";
import { ConvertLeadToShopUseCase } from "@/src/application/use-cases/lead/ConvertLeadToShopUseCase";
import { assertPasswordAcceptable } from "@/src/application/use-cases/auth/password-policy";
import { bahtToSatang } from "@/src/presentation/lib/money";
import { buildShopHandoff } from "@/src/presentation/lib/build-shop-handoff";
import type { ShopHandoff } from "@/src/presentation/lib/shop-handoff";
import type { Page } from "@/src/application/repositories/pagination";
import type {
  Lead,
  LeadLostReason,
  LeadStatus,
  LeadVisitReaction,
} from "@/src/domain/entities";

export interface LeadFormState {
  error?: string;
  success?: string;
  /** Present after converting a lead — credentials to hand the owner (once). */
  handoff?: ShopHandoff;
}

/** A lead plus its resolved category label — the list/load-more row shape. */
export interface LeadRow {
  lead: Lead;
  categoryName: string | null;
}

function parseCoord(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** A date input ("YYYY-MM-DD") or empty → ISO string or null. */
function dateToIso(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function toRows(leads: Lead[]): Promise<LeadRow[]> {
  const categories = await container.shopCategoryRepository.listActive();
  const name = new Map(categories.map((c) => [c.id, c.name]));
  return leads.map((lead) => ({
    lead,
    categoryName: lead.categoryId ? name.get(lead.categoryId) ?? null : null,
  }));
}

/** Next page of the leads list (admin "load more"), optionally status-filtered. */
export async function loadMoreLeadsAction(
  cursor: string,
  status?: LeadStatus | null,
): Promise<Page<LeadRow>> {
  await requireRole("platform_admin");
  const page = await container.leadRepository.page({ cursor, status });
  return { items: await toRows(page.items), nextCursor: page.nextCursor };
}

export async function createLeadAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    const user = await requireRole("platform_admin");
    await new CreateLeadUseCase(
      container.leadRepository,
      container.shopCategoryRepository,
    ).execute({
      name: String(formData.get("name") ?? ""),
      categoryId: String(formData.get("categoryId") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      latitude: parseCoord(formData.get("latitude")),
      longitude: parseCoord(formData.get("longitude")),
      notes: String(formData.get("notes") ?? "") || null,
      nextFollowUpAt: dateToIso(formData.get("nextFollowUpAt")),
      createdBy: user.id,
    });
    revalidatePath("/admin/leads");
    return { success: "เพิ่มลีดแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateLeadAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    await requireRole("platform_admin");
    const leadId = String(formData.get("leadId") ?? "");
    await new UpdateLeadUseCase(
      container.leadRepository,
      container.shopCategoryRepository,
    ).execute(leadId, {
      name: String(formData.get("name") ?? ""),
      categoryId: String(formData.get("categoryId") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      nextFollowUpAt: dateToIso(formData.get("nextFollowUpAt")),
    });
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    return { success: "บันทึกแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateLeadLocationAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    await requireRole("platform_admin");
    const leadId = String(formData.get("leadId") ?? "");
    await new UpdateLeadLocationUseCase(container.leadRepository).execute(
      leadId,
      {
        latitude: parseCoord(formData.get("latitude")),
        longitude: parseCoord(formData.get("longitude")),
        address: String(formData.get("address") ?? "") || null,
      },
    );
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads/map");
    return { success: "บันทึกตำแหน่งแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setLeadStatusAction(
  leadId: string,
  status: LeadStatus,
  lostReason?: LeadLostReason | null,
): Promise<{ error?: string }> {
  try {
    await requireRole("platform_admin");
    await new SetLeadStatusUseCase(container.leadRepository).execute(
      leadId,
      status,
      lostReason,
    );
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/leads/map");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addLeadVisitLogAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    const user = await requireRole("platform_admin");
    const leadId = String(formData.get("leadId") ?? "");
    const advanceRaw = String(formData.get("advanceTo") ?? "");
    await new AddLeadVisitLogUseCase(
      container.leadRepository,
      container.leadVisitLogRepository,
    ).execute({
      leadId,
      reaction: String(formData.get("reaction") ?? "") as LeadVisitReaction,
      note: String(formData.get("note") ?? "") || null,
      performedBy: user.id,
      advanceTo: advanceRaw ? (advanceRaw as LeadStatus) : undefined,
    });
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    return { success: "บันทึกการเข้าพบแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function uploadLeadPhotoAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    await requireRole("platform_admin");
    const leadId = String(formData.get("leadId") ?? "");
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("กรุณาแนบรูป");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    await new SaveLeadPhotoUseCase(
      container.leadRepository,
      container.slipStorage,
    ).execute({
      leadId,
      filename: file.name,
      contentType: file.type,
      bytes,
    });
    revalidatePath(`/admin/leads/${leadId}`);
    return { success: "อัปโหลดรูปแล้ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function convertLeadToShopAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    const user = await requireRole("platform_admin");
    const leadId = String(formData.get("leadId") ?? "");
    const ownerPassword = String(formData.get("ownerPassword") ?? "");
    const ownerEmail = String(formData.get("ownerEmail") ?? "");
    await assertPasswordAcceptable(ownerPassword, container.passwordBreachChecker);
    const { shop } = await new ConvertLeadToShopUseCase(
      container.leadRepository,
      container.leadVisitLogRepository,
      container.shopRepository,
      container.userRepository,
      container.subscriptionRepository,
      container.passwordHasher,
      container.branchRepository,
    ).execute({
      leadId,
      slug: String(formData.get("slug") ?? ""),
      ownerEmail,
      ownerPassword,
      pricePerDaySatang: bahtToSatang(
        Number(formData.get("pricePerDayBaht") ?? 0),
      ),
      performedBy: user.id,
    });
    // The detail page stays mounted (ConvertLeadButton renders in every state),
    // so this refresh flows `convertedSlug` in without dropping the credentials
    // handoff — its state lives in the (preserved) client component.
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/leads/map");
    revalidatePath("/admin/shops");
    return {
      success: `แปลงเป็นร้าน "${shop.name}" แล้ว (/s/${shop.slug})`,
      handoff: await buildShopHandoff({
        shopName: shop.name,
        slug: shop.slug,
        ownerEmail,
        ownerPassword,
      }),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
