export type Role = "platform_admin" | "shop_owner" | "branch_staff";

export const ROLES: Record<Role, Role> = {
  platform_admin: "platform_admin",
  shop_owner: "shop_owner",
  branch_staff: "branch_staff",
};

/** Default landing route per role after login. */
export const ROLE_HOME: Record<Role, string> = {
  platform_admin: "/admin",
  shop_owner: "/shop",
  branch_staff: "/staff",
};

/**
 * `common`-namespace message key per role (for UI: account pickers, badges).
 * Resolve with a `common` translator: `t(ROLE_LABEL_KEY[role])`. Keeps this
 * domain module free of user-facing copy.
 */
export const ROLE_LABEL_KEY: Record<
  Role,
  "rolePlatformAdmin" | "roleShopOwner" | "roleBranchStaff"
> = {
  platform_admin: "rolePlatformAdmin",
  shop_owner: "roleShopOwner",
  branch_staff: "roleBranchStaff",
};
