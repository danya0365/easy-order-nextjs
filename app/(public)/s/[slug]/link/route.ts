import { NextResponse } from "next/server";

import { container } from "@/src/infrastructure/di/container";
import { setMemberCookie } from "@/src/infrastructure/auth/member";
import { ClaimBindCodeUseCase } from "@/src/application/use-cases/member/ClaimBindCodeUseCase";

// Customer scans the kiosk's one-time bind QR → this exchanges the code for a
// device token, sets the httpOnly member cookie, and redirects to their history.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const code = new URL(request.url).searchParams.get("code") ?? "";

  const result = await new ClaimBindCodeUseCase(
    container.shopRepository,
    container.bindCodeRepository,
    container.customerDeviceRepository,
  ).execute(slug, code);

  if (!result) {
    return NextResponse.redirect(new URL(`/s/${slug}?bind=invalid`, request.url));
  }

  await setMemberCookie(slug, result.token);
  return NextResponse.redirect(new URL(`/s/${slug}`, request.url));
}
