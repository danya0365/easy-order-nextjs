import { container } from "@/src/infrastructure/di/container";
import { SetRiderAvailabilityUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { riderSessionFromRequest } from "@/src/infrastructure/auth/rider-session";
import { riderRedirect } from "../redirect";

/** Cookie-auth ว่าง/ไม่ว่าง toggle (plain form POST). Mode comes from the admin setting. */
export async function POST(req: Request) {
  let ok = false;
  try {
    const session = await riderSessionFromRequest(req);
    const form = await req.formData();
    const v = String(form.get("available") ?? "");
    const shopId = String(form.get("shopId") ?? "") || null;
    if (session && (v === "0" || v === "1")) {
      const mode = (await container.platformSettingsRepository.get()).riderAvailabilityMode;
      await new SetRiderAvailabilityUseCase(container.riderRepository).execute(session, v === "1", mode, shopId);
      ok = true;
    }
  } catch {
    ok = false;
  }
  return riderRedirect(ok ? "/rider" : "/rider?e=failed");
}
