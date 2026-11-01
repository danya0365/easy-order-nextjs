import { container } from "@/src/infrastructure/di/container";
import {
  RiderUpdateJobUseCase,
  type RiderJobAction,
} from "@/src/application/use-cases/rider/RiderUseCases";

const ACTIONS: RiderJobAction[] = ["picked_up", "delivered", "cod"];

/**
 * Plain HTML form POST from the rider page (no server actions: under
 * Referrer-Policy no-referrer the Origin can be "null", which the server-action
 * CSRF check rejects). The URL token itself is the credential; the use case
 * validates it by hash and scopes the order to the rider + their shop.
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
    const orderId = String(form.get("orderId") ?? "");
    const action = String(form.get("do") ?? "") as RiderJobAction;
    if (orderId && ACTIONS.includes(action)) {
      await new RiderUpdateJobUseCase(
        container.riderRepository,
        container.orderRepository,
      ).execute(token, orderId, action);
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
