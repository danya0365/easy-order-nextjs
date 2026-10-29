import { container } from "@/src/infrastructure/di/container";
import { getCrmAccess } from "@/src/infrastructure/auth/crm-access";
import { toCsv } from "@/src/domain/services/customer-crm";
import { crmCan } from "@/src/domain/services/crm-permissions";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";

/** Server-side cap for one CSV export (the whole filter is exported, not one page). */
const EXPORT_MAX = 10_000;
const IDS_MAX = 500;

/**
 * CSV of the CURRENT list filter (tab/q/channel/sort), or of `ids=…` within it.
 * Owner or staff. Full phone only for the real shop owner; staff and
 * impersonating admins get masked phones.
 */
export async function GET(request: Request) {
  const access = await getCrmAccess();
  if (!access || !crmCan(access.role, "exportMasked")) {
    return new Response("Forbidden", { status: 403 });
  }
  const { actor, shopId, fullPhone } = access;
  const sp = new URL(request.url).searchParams;
  const query = {
    tab: sp.get("tab") ?? undefined,
    q: sp.get("q") ?? undefined,
    channel: sp.get("channel") ?? undefined,
    sort: sp.get("sort") ?? undefined,
  };
  const idsParam = sp.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined;
  if (ids && ids.length > IDS_MAX) return new Response(`Too many ids (max ${IDS_MAX})`, { status: 413 });
  const { rows, overCap } = await container.customerCrmRepository.exportRows(shopId, query, { ids, cap: EXPORT_MAX });
  if (overCap) {
    return new Response(`Too many rows (max ${EXPORT_MAX}); narrow the filter`, { status: 413 });
  }
  await container.auditLogger.record({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: AUDIT_ACTIONS.customersExported,
    targetType: "shop",
    targetId: shopId,
    shopId,
    ip: await getClientIp(),
    metadata: { count: rows.length, fullPhone, tab: query.tab ?? null, q: query.q ? "set" : null, ids: ids?.length ?? null },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows, { fullPhone }), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
