"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Ban,
  CheckCircle2,
  Crown,
  ShieldMinus,
  ShieldPlus,
  Store,
  UserCog,
} from "lucide-react";

import {
  adminUserAction,
  type AdminUserActionState,
} from "@/src/presentation/actions/admin-user-actions";
import { useConfirm } from "@/src/presentation/components/ui/ConfirmDialog";

interface Props {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    isSuperadmin: boolean;
  };
  isSelf: boolean;
  actorIsSuper: boolean;
  branches: { id: string; name: string }[];
  shops: { id: string; name: string }[];
}

const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface disabled:opacity-50";
const danger = `${btn} border-red-300 text-red-700 hover:bg-red-50`;
const field = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function AdminUserActions({ user, isSelf, actorIsSuper, branches, shops }: Props) {
  const t = useTranslations("adminUsers");
  const confirm = useConfirm();
  const [state, action, pending] = useActionState<AdminUserActionState, FormData>(
    adminUserAction,
    {},
  );

  const Op = ({
    op,
    label,
    icon,
    dangerous,
    children,
  }: {
    op: string;
    label: string;
    icon: ReactNode;
    dangerous?: boolean;
    children?: ReactNode;
  }) => {
    async function onSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      if (dangerous) {
        const ok = await confirm({
          title: label,
          message: t("confirmMessage", { email: user.email }),
          confirmLabel: label,
          tone: "danger",
        });
        if (!ok) return;
      }
      startTransition(() => action(fd));
    }
    return (
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="op" value={op} />
        <input type="hidden" name="userId" value={user.id} />
        {children}
        <button type="submit" disabled={pending} className={dangerous ? danger : btn}>
          {icon}
          {label}
        </button>
      </form>
    );
  };

  const isAdmin = user.role === "platform_admin";
  return (
    <div className="flex flex-col gap-3">
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">{t("saved")}</p>}

      {user.isSuperadmin && <p className="text-xs text-muted">{t("superProtectedNote")}</p>}

      {!isSelf && !user.isSuperadmin && (!isAdmin || actorIsSuper) &&
        (user.isActive ? (
          <Op op="suspend" label={t("suspend")} icon={<Ban className="size-4" />} dangerous />
        ) : (
          <Op op="activate" label={t("activate")} icon={<CheckCircle2 className="size-4" />} />
        ))}

      {user.role === "branch_staff" && (
        <Op op="setOwner" label={t("makeOwner")} icon={<Store className="size-4" />} dangerous />
      )}
      {user.role === "shop_owner" && branches.length > 0 && (
        <Op op="setStaff" label={t("makeStaff")} icon={<UserCog className="size-4" />} dangerous>
          <select name="branchId" className={field} defaultValue={branches[0].id}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Op>
      )}

      {actorIsSuper && !isAdmin && (
        <Op op="promoteAdmin" label={t("promoteAdmin")} icon={<ShieldPlus className="size-4" />} dangerous />
      )}
      {actorIsSuper && isAdmin && !user.isSuperadmin && !isSelf && (
        <Op op="demoteAdmin" label={t("demoteAdmin")} icon={<ShieldMinus className="size-4" />} dangerous>
          <select name="shopId" className={field} required defaultValue="">
            <option value="" disabled>{t("pickShop")}</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Op>
      )}
      {actorIsSuper && isAdmin && user.isActive && !user.isSuperadmin && (
        <Op op="grantSuper" label={t("grantSuper")} icon={<Crown className="size-4" />} dangerous />
      )}
      {actorIsSuper && user.isSuperadmin && (
        <Op op="revokeSuper" label={t("revokeSuper")} icon={<Crown className="size-4" />} dangerous />
      )}
      {!actorIsSuper && <p className="text-xs text-muted">{t("superOnlyNote")}</p>}
    </div>
  );
}
