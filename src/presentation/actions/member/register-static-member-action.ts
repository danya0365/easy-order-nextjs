"use server";

import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { RegisterStaticMemberUseCase } from "@/src/application/use-cases/member/RegisterStaticMemberUseCase";
import { setMemberCookie } from "@/src/infrastructure/auth/member";
import {
  getOrSetDeviceId,
  hashClientIp,
} from "@/src/infrastructure/auth/static-join-signals";
import { verifyStaticJoinTurnstile } from "@/src/infrastructure/services/turnstile";
import { getClientIp } from "@/src/presentation/lib/request-ip";

export type RegisterStaticMemberState = { error?: string };

export async function registerStaticMemberAction(
  _prev: RegisterStaticMemberState,
  formData: FormData,
): Promise<RegisterStaticMemberState> {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: "ไม่พบร้านค้า" };

  const joinKey = String(formData.get("k") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const otpRaw = String(formData.get("otpCode") ?? "").trim();
  const otpCode = otpRaw || undefined;

  try {
    const ip = await getClientIp();
    const captcha = String(formData.get("captchaToken") ?? "").trim();
    if (!(await verifyStaticJoinTurnstile(captcha, ip))) {
      return { error: "ยืนยันว่าไม่ใช่บอทไม่สำเร็จ กรุณาลองใหม่" };
    }
    const deviceId = await getOrSetDeviceId();

    const result = await new RegisterStaticMemberUseCase(
      container.shopRepository,
      container.customerRepository,
      container.customerDeviceRepository,
      container.memberSignupGuardRepository,
    ).execute(slug, displayName, phone, otpCode, {
      joinKey,
      ipHash: hashClientIp(ip),
      deviceId,
    });

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
