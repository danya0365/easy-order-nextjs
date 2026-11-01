import { container } from "@/src/infrastructure/di/container";
import { SetRiderAvailabilityUseCase } from "@/src/application/use-cases/rider/RiderUseCases";

/**
 * Plain HTML form POST: rider toggles ว่าง/ไม่ว่าง. Not a server action (Origin
 * "null" under no-referrer fails the server-action CSRF check). The URL token
 * is the credential, validated by hash in the use case.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const back = `/r/${encodeURIComponent(token)}`;
  let ok = false;
  try {
    const form = await req.formData();
    const v = String(form.get("available") ?? "");
    if (v === "0" || v === "1") {
      await new SetRiderAvailabilityUseCase(container.riderRepository).execute(token, v === "1");
      ok = true;
    }
  } catch {
    ok = false;
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: ok ? back : `${back}?e=failed`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
