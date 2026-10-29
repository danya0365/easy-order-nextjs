import "server-only";

import { redirect } from "next/navigation";

import type { User } from "@/src/domain/entities";
import { getImpersonation, getSession } from "@/src/infrastructure/auth/session";
import { crmFullPhone, type CrmRole } from "@/src/domain/services/crm-permissions";

export interface CrmAccess {
  actor: User;
  shopId: string;
  role: CrmRole;
  impersonating: boolean;
  fullPhone: boolean;
  /** Route prefix for this actor's CRM screens. */
  base: "/shop" | "/staff";
}

async function resolve(): Promise<CrmAccess | null> {
  const user = await getSession();
  if (!user || !user.isActive) return null;
  if (user.role === "shop_owner" && user.shopId) {
    return { actor: user, shopId: user.shopId, role: "owner", impersonating: false, fullPhone: crmFullPhone("owner", false), base: "/shop" };
  }
  if (user.role === "branch_staff" && user.shopId) {
    return { actor: user, shopId: user.shopId, role: "staff", impersonating: false, fullPhone: false, base: "/staff" };
  }
  if (user.role === "platform_admin") {
    const imp = await getImpersonation();
    if (imp) return { actor: user, shopId: imp.shopId, role: "owner", impersonating: true, fullPhone: false, base: "/shop" };
  }
  return null;
}

/** Pages / route handlers: owner, impersonating admin or branch staff; else redirect. */
export async function requireCrmView(expect?: CrmRole): Promise<CrmAccess> {
  const a = await resolve();
  if (!a) redirect("/login");
  if (expect && a.role !== expect) redirect(a.base === "/staff" ? "/staff/customers" : "/shop/customers");
  return a;
}

/** Route handlers that must not redirect. */
export async function getCrmAccess(): Promise<CrmAccess | null> {
  return resolve();
}

/** Server actions: throws instead of redirecting. */
export async function requireCrmActor(): Promise<CrmAccess> {
  const a = await resolve();
  if (!a) throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลลูกค้าร้านนี้");
  return a;
}
