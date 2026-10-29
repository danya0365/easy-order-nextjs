import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { AdminUserActions } from "@/src/presentation/components/admin/AdminUserActions";

export const dynamic = "force-dynamic";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "—";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireRole("platform_admin");
  const { id } = await params;
  const t = await getTranslations("adminUsers");
  const tc = await getTranslations("common");
  const user = await container.userRepository.findById(id);
  if (!user) notFound();
  const [shop, branches, shops, actor] = await Promise.all([
    user.shopId ? container.shopRepository.findById(user.shopId) : null,
    user.shopId ? container.branchRepository.listByShop(user.shopId) : [],
    container.shopRepository.list(),
    container.userRepository.findById(me.id),
  ]);
  const branch = branches.find((b) => b.id === user.branchId);
  const roleLabel =
    user.role === "platform_admin" ? tc("rolePlatformAdmin") : user.role === "shop_owner" ? tc("roleShopOwner") : tc("roleBranchStaff");
  const rows: [string, string][] = [
    [t("email"), user.email],
    [t("role"), roleLabel],
    [t("shop"), shop?.name ?? "—"],
    [t("branch"), branch?.name ?? "—"],
    [t("twoFactor"), user.totpEnabled ? t("yes") : t("no")],
    [t("line"), user.lineUserId ? t("yes") : t("no")],
    [t("createdAt"), fmt(user.createdAt)],
    [t("updatedAt"), fmt(user.updatedAt)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              {user.isSuperadmin && <Crown className="size-5 text-amber-500" />}
              {user.email}
            </span>
          }
          action={
            <span className="flex gap-1">
              {user.isSuperadmin && <Badge tone="brand">{t("superadmin")}</Badge>}
              <Badge tone={user.isActive ? "success" : "danger"}>
                {user.isActive ? t("statusActive") : t("statusSuspended")}
              </Badge>
            </span>
          }
        />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="break-all">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title={t("actions")} />
        <AdminUserActions
          user={{
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            isSuperadmin: !!user.isSuperadmin,
          }}
          isSelf={user.id === me.id}
          actorIsSuper={!!actor?.isSuperadmin}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          shops={shops.map((s) => ({ id: s.id, name: s.name }))}
        />
      </Card>
    </div>
  );
}
