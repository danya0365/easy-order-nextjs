"use server";

import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { RegisterStaticMemberUseCase } from "@/src/application/use-cases/member/RegisterStaticMemberUseCase";
import { setMemberCookie } from "@/src/infrastructure/auth/member";

export type RegisterStaticMemberState = { error?: string };

export async function registerStaticMemberAction(
  _prev: RegisterStaticMemberState,
  formData: FormData,
): Promise<RegisterStaticMemberState> {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: "ไม่พบร้านค้า" };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const otpRaw = String(formData.get("otpCode") ?? "").trim();
  const otpCode = otpRaw || undefined;

  try {
    const result = await new RegisterStaticMemberUseCase(
      container.shopRepository,
      container.customerRepository,
      container.customerDeviceRepository,
    ).execute(slug, displayName, phone, otpCode);

    await setMemberCookie(slug, result.token);

    if (result.customer.onlineOrderStatus === "approved") {
      redirect(`/s/${slug}/join`);
    }
    redirect(`/s/${slug}/join/pending`);
  } catch (e) {
    // Next.js redirect() throws; rethrow those.
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return { error: (e as Error).message || "ลงทะเบียนไม่สำเร็จ" };
  }
}
