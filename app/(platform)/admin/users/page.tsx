import Link from "next/link";
import { Crown, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { countUsers, filterUsers } from "@/src/application/use-cases/admin/AdminUserManagement";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { StatCard } from "@/src/presentation/components/ui/StatCard";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("platform_admin");
  const sp = await searchParams;
  const t = await getTranslations("adminUsers");
  const tc = await getTranslations("common");
  const [all, shops] = await Promise.all([
    container.userRepository.list(),
    container.shopRepository.list(),
  ]);
  const c = countUsers(all);
  const rows = filterUsers(all, sp);
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  const roleLabel = (r: string) =>
    r === "platform_admin" ? tc("rolePlatformAdmin") : r === "shop_owner" ? tc("roleShopOwner") : tc("roleBranchStaff");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label={t("countAdmins")} value={c.platformAdmins} />
        <StatCard label={t("countSuper")} value={c.superadmins} />
        <StatCard label={t("countOwners")} value={c.owners} />
        <StatCard label={t("countStaff")} value={c.staff} />
        <StatCard label={t("countTotal")} value={c.total} hint={t("countSuspended", { n: c.suspended })} />
      </div>
      <Card>
        <CardHeader title={t("title")} subtitle={t("subtitle")} />
        <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder={t("searchPlaceholder")} className={`${field} pl-8`} />
          </div>
          <select name="role" defaultValue={sp.role ?? ""} className={field}>
            <option value="">{t("allRoles")}</option>
            <option value="superadmin">{t("superadmin")}</option>
            <option value="platform_admin">{tc("rolePlatformAdmin")}</option>
            <option value="shop_owner">{tc("roleShopOwner")}</option>
            <option value="branch_staff">{tc("roleBranchStaff")}</option>
          </select>
          <select name="shopId" defaultValue={sp.shopId ?? ""} className={field}>
            <option value="">{t("allShops")}</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className={field}>
            <option value="">{t("allStatus")}</option>
            <option value="active">{t("statusActive")}</option>
            <option value="suspended">{t("statusSuspended")}</option>
          </select>
          <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-on-brand">{t("filter")}</button>
        </form>
        <p className="mb-2 text-xs text-muted">{t("showing", { n: rows.length, total: c.total })}</p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-surface">
                  <span className="flex items-center gap-2">
                    {u.isSuperadmin && <Crown className="size-4 text-amber-500" />}
                    <span>
                      {u.email}
                      <span className="block text-xs text-muted">
                        {roleLabel(u.role)}
                        {u.shopId ? ` · ${shopName.get(u.shopId) ?? u.shopId}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="flex gap-1">
                    {u.isSuperadmin && <Badge tone="brand">{t("superadmin")}</Badge>}
                    <Badge tone={u.isActive ? "success" : "danger"}>
                      {u.isActive ? t("statusActive") : t("statusSuspended")}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
