"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { container } from "@/src/infrastructure/di/container";
import { requireRole, requireShopWrite } from "@/src/infrastructure/auth/session";
import { getClientIp } from "@/src/presentation/lib/request-ip";
import { SubmitPublicContactRequestUseCase } from "@/src/application/use-cases/contact/SubmitPublicContactRequestUseCase";
import { SubmitOwnerContactRequestUseCase } from "@/src/application/use-cases/contact/SubmitOwnerContactRequestUseCase";
import { ResolveContactRequestUseCase } from "@/src/application/use-cases/contact/ResolveContactRequestUseCase";
import type { Page } from "@/src/application/repositories/pagination";
import type { ContactRow } from "@/src/presentation/components/admin/ContactInbox";

export interface ContactFormState {
  error?: string;
  success?: string;
}

const publicContactSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  subject: z.string().trim().min(1, "กรุณากรอกหัวข้อ").max(120),
  message: z.string().trim().min(1, "กรุณากรอกข้อความ").max(1000),
  contactChannel: z.string().trim().min(1, "กรุณากรอกช่องทางติดต่อกลับ").max(200),
});

/**
 * PUBLIC contact form on the login page — for users locked out of sign-in.
 * Unauthenticated, so: honeypot + CAPTCHA (Turnstile) + per-IP rate-limit.
 */
export async function contactAdminPublicAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  try {
    // Honeypot: real users never fill this hidden field.
    if (String(formData.get("company") ?? "").trim() !== "") {
      return { success: "ส่งคำขอติดต่อแล้ว ผู้ดูแลจะติดต่อกลับโดยเร็ว" };
    }

    const parsed = publicContactSchema.safeParse({
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      contactChannel: formData.get("contactChannel"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const ip = await getClientIp();

    await new SubmitPublicContactRequestUseCase(
      container.turnstile,
      container.rateLimitRepository,
      container.contactRequestRepository,
      container.notificationService,
    ).execute({
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      contactChannel: parsed.data.contactChannel,
      ip,
      captchaToken: String(formData.get("captchaToken") ?? ""),
    });

    return { success: "ส่งคำขอติดต่อแล้ว ผู้ดูแลจะติดต่อกลับโดยเร็วที่สุด" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Next page of resolved contact requests (admin inbox "load more"). */
export async function loadMoreResolvedContactsAction(
  cursor: string,
): Promise<Page<ContactRow>> {
  await requireRole("platform_admin");
  const page = await container.contactRequestRepository.pageResolved({ cursor });
  const shops = await container.shopRepository.list();
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  return {
    items: page.items.map((request) => ({
      request,
      shopName: (request.shopId ? shopName.get(request.shopId) : null) ?? "-",
    })),
    nextCursor: page.nextCursor,
  };
}

/** Shop owner sends a contact request to the platform admin. */
export async function contactAdminAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  try {
    const { actor, shopId } = await requireShopWrite();

    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const contactChannel = String(formData.get("contactChannel") ?? "").trim();
    if (!subject || !message || !contactChannel) {
      throw new Error("กรุณากรอกหัวข้อ ข้อความ และช่องทางติดต่อกลับให้ครบ");
    }

    await new SubmitOwnerContactRequestUseCase(
      container.contactRequestRepository,
      container.shopRepository,
      container.notificationService,
    ).execute({
      shopId,
      userId: actor.id,
      subject,
      message,
      contactChannel,
    });

    revalidatePath("/shop/contact");
    return { success: "ส่งคำขอติดต่อแล้ว ผู้ดูแลจะติดต่อกลับโดยเร็ว" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin marks a contact request as resolved (and tells the shop owner). */
export async function resolveContactAction(id: string): Promise<void> {
  const admin = await requireRole("platform_admin");
  await new ResolveContactRequestUseCase(
    container.contactRequestRepository,
    container.notificationService,
  ).execute(id, admin.id);

  revalidatePath("/admin/contacts");
  revalidatePath("/shop/contact");
}
