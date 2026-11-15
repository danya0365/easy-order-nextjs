import { container } from "@/src/infrastructure/di/container";
import { RiderUpdateJobUseCase, type RiderJobAction } from "@/src/application/use-cases/rider/RiderUseCases";
import { sessionFromCookieValue } from "@/src/infrastructure/auth/rider-session";
import { riderRedirect } from "../../../rider/redirect";

const ACTIONS: RiderJobAction[] = ["picked_up", "delivered", "cod", "cod_delivered"];

/** Legacy form POST from the pre-app rider page (link token in the URL = credential for that shop). */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  let err = "failed";
  try {
    const session = await sessionFromCookieValue(token);
    const form = await req.formData();
    const orderId = String(form.get("orderId") ?? "");
    const action = String(form.get("do") ?? "") as RiderJobAction;
    if (session && orderId && ACTIONS.includes(action)) {
      const shopId = session.memberships[0].shopId;
      await new RiderUpdateJobUseCase(container.orderRepository).execute(session, shopId, orderId, action);
      err = "";
    }
  } catch {
    err = "failed";
  }
  return riderRedirect(`/r/${encodeURIComponent(token)}${err ? `?e=${err}` : ""}`);
}
