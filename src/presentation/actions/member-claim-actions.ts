"use server";

import { redirect } from "next/navigation";

import { container } from "@/src/infrastructure/di/container";
import { setMemberCookie } from "@/src/infrastructure/auth/member";
import { verifyCustomerClaimSig } from "@/src/infrastructure/auth/customer-claim";
import { ClaimCustomerCardUseCase } from "@/src/application/use-cases/member/ClaimCustomerCardUseCase";

/**
 * Confirm tap on /s/[slug]/member/claim: re-verify the HMAC-signed link
 * server-side (never trust the rendered page), bind this device to the
 * customer, set the httpOnly member cookie, then open their orders tab.
 */
export async function confirmCustomerClaimAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const sig = String(formData.get("sig") ?? "");
  const base = `/s/${encodeURIComponent(slug)}`;
  if (!slug || !verifyCustomerClaimSig(slug, code, sig)) {
    redirect(`${base}/member/claim?error=invalid`);
  }
  const result = await new ClaimCustomerCardUseCase(
    container.shopRepository,
    container.customerRepository,
    container.customerDeviceRepository,
  ).claim(slug, code);
  if (!result) redirect(`${base}/member/claim?error=invalid`);
  await setMemberCookie(slug, result.token);
  redirect(`${base}/orders?linked=1`);
}
