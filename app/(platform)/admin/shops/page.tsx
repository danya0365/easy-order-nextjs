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
import { LoyaltyAllowToggle } from "@/src/presentation/components/loyalty/LoyaltyAllowToggle";
import { PromotionsAllowToggle } from "@/src/presentation/components/promotions/PromotionsAllowToggle";
import { PauseShopToggle } from "@/src/presentation/components/admin/PauseShopToggle";
import { OneTimeLoginLinkButton } from "@/src/presentation/components/admin/OneTimeLoginLinkButton";
import { eligibleAccounts } from "@/src/application/use-cases/auth/OneTimeLoginUseCases";
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
    container.platformSettingsRepository,
    container.orderRepository,
  );
  const [states, members, activeLinks] = await Promise.all([
    Promise.all(shops.map((s) => billing.execute(s.id))),
    Promise.all(shops.map((s) => container.userRepository.listByShop(s.id))),
    container.adminLoginLinkRepository.listActive(new Date().toISOString()),
  ]);
  const owners = members.map(
    (m) => m.find((u) => u.role === "shop_owner") ?? null,
  );
  const roleLabel = (r: string) => (r === "shop_owner" ? "owner" : "staff");

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
                  className="flex min-w-0 flex-col gap-3 py-3 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-foreground">
                      {shop.name}
                    </p>
                    <Link
                      href={`/s/${shop.slug}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      /s/{shop.slug}
                    </Link>
                    {owner && (
                      <p className="break-all text-xs text-muted">
                        {t("ownerLabel", { email: owner.email })}
                      </p>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 lg:items-end">
                    <div>
                      {adminSuspended ? (
                        <Badge tone="danger">{t("badgeAdminSuspended")}</Badge>
                      ) : status.isPaused ? (
                        <Badge tone="warning">{t("badgePaused")}</Badge>
                      ) : status.isSuspended ? (
                        <Badge tone="danger">
                          {t("badgeOverdueSuspended")}
                        </Badge>
                      ) : status.state === "overdue" ? (
                        <Badge tone="warning">
                          {t("badgeOverdue", { days: status.daysOverdue })}
                        </Badge>
                      ) : (
                        <Badge tone="success">{t("badgeNormal")}</Badge>
                      )}
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-start sm:justify-start lg:justify-end [&>button]:w-full [&>button]:justify-center [&>button]:whitespace-nowrap [&>form>button]:w-full [&>form>button]:justify-center [&>form>button]:whitespace-nowrap [&>div>button]:w-full [&>div>button]:justify-center [&>div>button]:whitespace-nowrap [&>div]:items-stretch sm:[&>button]:w-auto sm:[&>form>button]:w-auto sm:[&>div>button]:w-auto sm:[&>div]:items-end">
                      {!adminSuspended && (
                        <PauseShopToggle
                          shopId={shop.id}
                          paused={status.isPaused}
                        />
                      )}
                      <LoyaltyAllowToggle
                        shopId={shop.id}
                        allowed={shop.loyaltyAllowedByAdmin}
                      />
                      <PromotionsAllowToggle
                        shopId={shop.id}
                        allowed={shop.promotionsAllowedByAdmin}
                      />
                      <ShopStatusToggle
                        shopId={shop.id}
                        adminSuspended={adminSuspended}
                      />
                      <form
                        action={startImpersonationAction.bind(null, shop.id)}
                      >
                        <button
                          type="submit"
                          title={t("impersonateTitle")}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                        >
                          <Eye className="size-3.5" />
                          {t("impersonateButton")}
                        </button>
                      </form>
                      {(() => {
                        const accts = eligibleAccounts(members[i], shop.id);
                        const label = (id: string | null) => {
                          const u = accts.find((a) => a.id === id);
                          return u ? `${u.email} (${roleLabel(u.role)})` : null;
                        };
                        return (
                          <OneTimeLoginLinkButton
                            shopId={shop.id}
                            accounts={accts.map((u) => ({
                              id: u.id,
                              label: label(u.id)!,
                            }))}
                            activeLinks={activeLinks
                              .filter((l) => l.shopId === shop.id)
                              .map((l) => ({
                                id: l.id,
                                expiresAt: l.expiresAt,
                                target: label(l.targetUserId),
                              }))}
                          />
                        );
                      })()}
                      {owner && (
                        <>
                          <ShopHandoffButton shopId={shop.id} />
                          <ResetPasswordControl
                            kind="owner"
                            userId={owner.id}
                          />
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
