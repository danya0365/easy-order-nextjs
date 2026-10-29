import { container } from "@/src/infrastructure/di/container";
import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { queryCrm, toCsv } from "@/src/domain/services/customer-crm";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";

/**
 * CSV of the CURRENT list filter (tab/q/channel/sort, optional ids=…).
 * Full phone only for the shop owner; impersonating admins get masked phones.
 */
export async function GET(request: Request) {
  const { user, shopId, impersonating } = await requireShopAccess();
  const sp = new URL(request.url).searchParams;
  const rows = await container.customerCrmRepository.listWithStats(shopId);
  let out = queryCrm(rows, {
    tab: sp.get("tab") ?? undefined,
    q: sp.get("q") ?? undefined,
    channel: sp.get("channel") ?? undefined,
    sort: sp.get("sort") ?? undefined,
  });
  const ids = sp.get("ids");
  if (ids) {
    const want = new Set(ids.split(",").slice(0, 500));
    out = out.filter((r) => want.has(r.id));
  }
  const fullPhone = user.role === "shop_owner" && !impersonating;
  await container.auditLogger.record({
    actorUserId: user.id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.customersExported,
    targetType: "shop",
    targetId: shopId,
    shopId,
    ip: await getClientIp(),
    metadata: { count: out.length, fullPhone, tab: sp.get("tab"), q: sp.get("q") ? "set" : null },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(out, { fullPhone }), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
