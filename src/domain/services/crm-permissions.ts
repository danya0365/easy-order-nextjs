/**
 * Who may do what in the customer CRM.
 *  - "owner": the shop_owner, or a platform_admin impersonating the shop.
 *  - "staff": branch_staff of the same shop.
 * Staff run the counter: they can look customers up (masked phone), moderate
 * pending sign-ups, keep the shared note and redeem rewards (they already can
 * at the counter). Anything that changes money-like value, access, PII
 * exposure or segmentation stays owner-only.
 */
export type CrmRole = "owner" | "staff";

export const CRM_PERMS = {
  view: ["owner", "staff"],
  approve: ["owner", "staff"],
  note: ["owner", "staff"],
  redeem: ["owner", "staff"],
  exportMasked: ["owner", "staff"],
  editName: ["owner"],
  tags: ["owner"],
  points: ["owner"],
  block: ["owner"],
  newMember: ["owner"],
  resetDevices: ["owner"],
  pdpa: ["owner"],
  rejectSuspicious: ["owner"],
  bulkBlock: ["owner"],
} as const satisfies Record<string, readonly CrmRole[]>;

export type CrmPerm = keyof typeof CRM_PERMS;

export function crmCan(role: CrmRole, perm: CrmPerm): boolean {
  return (CRM_PERMS[perm] as readonly CrmRole[]).includes(role);
}

export function assertCrmCan(role: CrmRole, perm: CrmPerm): void {
  if (!crmCan(role, perm)) throw new Error("ไม่มีสิทธิ์ทำรายการนี้ (เฉพาะเจ้าของร้าน)");
}

/** Full phone numbers only for the real owner (not staff, not impersonating admins). */
export function crmFullPhone(role: CrmRole, impersonating: boolean): boolean {
  return role === "owner" && !impersonating;
}
