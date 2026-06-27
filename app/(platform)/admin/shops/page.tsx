import Link from "next/link";
import { Eye, LogOut, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/src/infrastructure/auth/session";
import {
  startImpersonationAction,
  forceLogoutUserAction,
} from "@/src/presentation/actions/admin-actions";
import { container } from "@/src/infrastructure/di/container";
import { GetBillingStateUseCase } from "@/src/application/use-cases/billing/GetBillingStateUseCase";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { Badge } from "@/src/presentation/components/ui/Badge";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { CreateShopForm } from "@/src/presentation/components/admin/CreateShopForm";
import { ShopStatusToggle } from "@/src/presentation/components/admin/ShopStatusToggle";
import { PauseShopToggle } from "@/src/presentation/components/admin/PauseShopToggle";
import { ShopHandoffButton } from "@/src/presentation/components/admin/ShopHandoffButton";
import { ConfirmSubmitButton } from "@/src/presentation/components/ui/ConfirmDialog";
import { ResetPasswordControl } from "@/src/presentation/components/auth/ResetPasswordControl";

export const dynamic = "force-dynamic";

export default async function AdminShopsPage() {
  await requireRole("platform_admin");
  const t = await getTranslations("adminPages");
  const shops = await container.shopRepository.list();
  const billing = new GetBillingStateUseCase(
    container.shopRepository,
    container.subscriptionRepository,
  );
  const [states, owners] = await Promise.all([
    Promise.all(shops.map((s) => billing.execute(s.id))),
    Promise.all(
      shops.map(async (s) => {
        const members = await container.userRepository.listByShop(s.id);
        return members.find((u) => u.role === "shop_owner") ?? null;
      }),
    ),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("addShopTitle")} />
        <CreateShopForm />
      </Card>

      <Card>
        <CardHeader title={t("allShopsTitle", { count: shops.length })} />
        {shops.length === 0 ? (
          <EmptyState icon={<Store />} title={t("noShops")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {shops.map((shop, i) => {
              const { status } = states[i];
              const owner = owners[i];
              const adminSuspended = shop.status === "suspended_by_admin";
              return (
                <li
                  key={shop.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{shop.name}</p>
                    <Link
                      href={`/s/${shop.slug}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      /s/{shop.slug}
                    </Link>
                    {owner && (
                      <p className="text-xs text-muted">{t("ownerLabel", { email: owner.email })}</p>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    {adminSuspended ? (
                      <Badge tone="danger">{t("badgeAdminSuspended")}</Badge>
                    ) : status.isPaused ? (
                      <Badge tone="warning">{t("badgePaused")}</Badge>
                    ) : status.isSuspended ? (
                      <Badge tone="danger">{t("badgeOverdueSuspended")}</Badge>
                    ) : status.state === "overdue" ? (
                      <Badge tone="warning">{t("badgeOverdue", { days: status.daysOverdue })}</Badge>
                    ) : (
                      <Badge tone="success">{t("badgeNormal")}</Badge>
                    )}
                    {!adminSuspended && (
                      <PauseShopToggle
                        shopId={shop.id}
                        paused={status.isPaused}
                      />
                    )}
                    <ShopStatusToggle
                      shopId={shop.id}
                      adminSuspended={adminSuspended}
                    />
                    <form action={startImpersonationAction.bind(null, shop.id)}>
                      <button
                        type="submit"
                        title={t("impersonateTitle")}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                      >
                        <Eye className="size-3.5" />
                        {t("impersonateButton")}
                      </button>
                    </form>
                    {owner && (
                      <>
                        <ShopHandoffButton shopId={shop.id} />
                        <ResetPasswordControl kind="owner" userId={owner.id} />
                        <ConfirmSubmitButton
                          action={async () => {
                            "use server";
                            await forceLogoutUserAction(owner.id);
                          }}
                          title={t("forceLogoutTitle")}
                          message={t("forceLogoutOwnerMessage")}
                          confirmLabel={t("forceLogoutConfirm")}
                          buttonTitle={t("forceLogoutButtonTitle")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-error"
                        >
                          <LogOut className="size-3.5" />
                          {t("kickOut")}
                        </ConfirmSubmitButton>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
