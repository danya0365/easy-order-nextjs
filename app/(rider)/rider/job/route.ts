import { container } from "@/src/infrastructure/di/container";
import {
  RiderUpdateJobUseCase,
  type RiderJobAction,
} from "@/src/application/use-cases/rider/RiderUseCases";
import { riderTokenFromRequest } from "@/src/infrastructure/auth/rider-session";
import { riderRedirect } from "../redirect";

const ACTIONS: RiderJobAction[] = ["picked_up", "delivered", "cod"];

/** Cookie-auth job update (plain form POST, not a server action). */
export async function POST(req: Request) {
  const token = riderTokenFromRequest(req);
  let ok = false;
  try {
    const form = await req.formData();
    const orderId = String(form.get("orderId") ?? "");
    const action = String(form.get("do") ?? "") as RiderJobAction;
    if (token && orderId && ACTIONS.includes(action)) {
      await new RiderUpdateJobUseCase(container.riderRepository, container.orderRepository).execute(
        token,
        orderId,
        action,
      );
      ok = true;
    }
  } catch {
    ok = false;
  }
  return riderRedirect(ok ? "/rider" : "/rider?e=failed");
}
