import { LogOut, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireShopAccess } from "@/src/infrastructure/auth/session";
import { container } from "@/src/infrastructure/di/container";
import { forceLogoutStaffAction } from "@/src/presentation/actions/shop-actions";
import { Card, CardHeader } from "@/src/presentation/components/ui/Card";
import { EmptyState } from "@/src/presentation/components/ui/EmptyState";
import { AddStaffForm } from "@/src/presentation/components/shop/AddStaffForm";
import { ToggleActiveButton } from "@/src/presentation/components/shop/ToggleActiveButton";
import { ConfirmSubmitButton } from "@/src/presentation/components/ui/ConfirmDialog";
import { ResetPasswordControl } from "@/src/presentation/components/auth/ResetPasswordControl";

export const dynamic = "force-dynamic";

export default async function ShopStaffPage() {
  const { shopId } = await requireShopAccess();
  const t = await getTranslations("shopPages");
  const [branches, users] = await Promise.all([
    container.branchRepository.listByShop(shopId),
    container.userRepository.listByShop(shopId),
  ]);
  const staff = users.filter((u) => u.role === "branch_staff");
  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("addStaffTitle")} />
        <AddStaffForm branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
      </Card>

      <Card>
        <CardHeader title={t("allStaffTitle", { count: staff.length })} />
        {staff.length === 0 ? (
          <EmptyState icon={<User />} title={t("noStaff")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div>
                  <p className="text-foreground">{s.email}</p>
                  <p className="text-xs text-muted">
                    {s.branchId ? branchName.get(s.branchId) ?? "—" : "—"}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ToggleActiveButton
                    kind="staff"
                    id={s.id}
                    isActive={s.isActive}
                  />
                  <ResetPasswordControl kind="staff" userId={s.id} />
                  <ConfirmSubmitButton
                    action={async () => {
                      "use server";
                      await forceLogoutStaffAction(s.id);
                    }}
                    title={t("forceLogoutTitle")}
                    message={t("forceLogoutMessage")}
                    confirmLabel={t("forceLogoutConfirm")}
                    buttonTitle={t("forceLogoutButtonTitle")}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-error"
                  >
                    <LogOut className="size-3.5" />
                    {t("kickOut")}
                  </ConfirmSubmitButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
