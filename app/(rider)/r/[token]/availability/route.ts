import { container } from "@/src/infrastructure/di/container";
import { SetRiderAvailabilityUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { sessionFromCookieValue } from "@/src/infrastructure/auth/rider-session";
import { riderRedirect } from "../../../rider/redirect";

/** Legacy ว่าง/ไม่ว่าง form POST (link token in the URL = credential for that shop only). */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  let ok = false;
  try {
    const session = await sessionFromCookieValue(token);
    const v = String((await req.formData()).get("available") ?? "");
    if (session && (v === "0" || v === "1")) {
      const m = session.memberships[0];
      await new SetRiderAvailabilityUseCase(container.riderRepository).execute(session, v === "1", "per_shop", m.shopId);
      ok = true;
    }
  } catch {
    ok = false;
  }
  return riderRedirect(`/r/${encodeURIComponent(token)}${ok ? "" : "?e=failed"}`);
}
