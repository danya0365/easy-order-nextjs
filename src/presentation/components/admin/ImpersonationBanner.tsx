import { UserCog } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { stopImpersonationAction } from "@/src/presentation/actions/admin-actions";

/**
 * Sticky banner shown while a platform_admin is acting in a shop's name.
 * Impersonation is read-write (the admin can edit the shop's data on their
 * behalf); changes are audit-logged under the admin's own account. Makes the
 * state obvious and offers a one-click exit.
 */
export async function ImpersonationBanner({ shopName }: { shopName: string }) {
  const t = await getTranslations("admin");
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-warning bg-warning-surface px-4 py-2 text-sm text-warning">
      <span className="flex min-w-0 items-center gap-1.5">
        <UserCog className="size-4 shrink-0" />
        <span className="truncate">
          {t.rich("impersonatingRich", {
            shop: shopName,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </span>
      </span>
      <form action={stopImpersonationAction}>
        <button
          type="submit"
          className="shrink-0 rounded-md border border-warning px-2.5 py-1 text-xs font-medium hover:bg-warning/10"
        >
          {t("exitImpersonation")}
        </button>
      </form>
    </div>
  );
}
