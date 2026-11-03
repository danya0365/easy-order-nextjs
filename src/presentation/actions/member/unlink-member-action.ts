"use server";

import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { clearMemberCookie, getMemberToken } from "@/src/infrastructure/auth/member";
import { UnlinkMemberDeviceUseCase } from "@/src/application/use-cases/member/UnlinkMemberDeviceUseCase";

/** Unlink this device from the shop member, clear the cookie, back to history. */
export async function unlinkMemberDeviceAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  if (!slug || slug.length > 100) redirect("/");
  await new UnlinkMemberDeviceUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
  ).execute(slug, await getMemberToken(slug));
  await clearMemberCookie(slug);
  redirect(`/s/${encodeURIComponent(slug)}/orders?unlinked=1`);
}
