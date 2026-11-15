import { container } from "@/src/infrastructure/di/container";
import { RiderUpdateJobUseCase, type RiderJobAction } from "@/src/application/use-cases/rider/RiderUseCases";
import { riderSessionFromRequest } from "@/src/infrastructure/auth/rider-session";
import { riderRedirect } from "../redirect";

const ACTIONS: RiderJobAction[] = ["picked_up", "delivered", "cod", "cod_delivered"];

/** Cookie-auth job update (plain form POST, not a server action). Error text goes back as ?msg=. */
export async function POST(req: Request) {
  let msg = "";
  let back = "/rider";
  try {
    const session = await riderSessionFromRequest(req);
    const form = await req.formData();
    const orderId = String(form.get("orderId") ?? "");
    const shopId = String(form.get("shopId") ?? "");
    const action = String(form.get("do") ?? "") as RiderJobAction;
    const filter = String(form.get("filter") ?? "");
    if (filter) back = `/rider?shop=${encodeURIComponent(filter)}`;
    if (!session) throw new Error("ลิงก์ไม่ถูกต้องหรือถูกยกเลิกแล้ว");
    if (!orderId || !shopId || !ACTIONS.includes(action)) throw new Error("ข้อมูลไม่ครบ");
    await new RiderUpdateJobUseCase(container.orderRepository).execute(session, shopId, orderId, action);
  } catch (e) {
    msg = e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ";
  }
  if (!msg) return riderRedirect(back);
  const sep = back.includes("?") ? "&" : "?";
  return riderRedirect(`${back}${sep}e=failed&msg=${encodeURIComponent(msg.slice(0, 120))}`);
}
