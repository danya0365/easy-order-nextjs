import { container } from "@/src/infrastructure/di/container";
import { SetRiderAvailabilityUseCase } from "@/src/application/use-cases/rider/RiderUseCases";
import { riderTokenFromRequest } from "@/src/infrastructure/auth/rider-session";
import { riderRedirect } from "../redirect";

/** Cookie-auth ว่าง/ไม่ว่าง toggle (plain form POST). */
export async function POST(req: Request) {
  const token = riderTokenFromRequest(req);
  let ok = false;
  try {
    const v = String((await req.formData()).get("available") ?? "");
    if (token && (v === "0" || v === "1")) {
      await new SetRiderAvailabilityUseCase(container.riderRepository).execute(token, v === "1");
      ok = true;
    }
  } catch {
    ok = false;
  }
  return riderRedirect(ok ? "/rider" : "/rider?e=failed");
}
