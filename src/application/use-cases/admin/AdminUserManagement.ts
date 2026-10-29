import type { User } from "@/src/domain/entities";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IAdminUserRepository } from "@/src/application/repositories/IAdminUserRepository";
import type { ISessionRepository } from "@/src/application/repositories/ISessionRepository";
import type { IBranchRepository } from "@/src/application/repositories/IBranchRepository";

export type AdminUserErrorCode =
  | "forbidden"
  | "not_found"
  | "self"
  | "superadmin_protected"
  | "last_superadmin"
  | "invalid_target"
  | "invalid_branch";

export class AdminUserError extends Error {
  constructor(readonly code: AdminUserErrorCode) {
    super(code);
  }
}

export interface AdminUserCounts {
  total: number;
  platformAdmins: number;
  superadmins: number;
  owners: number;
  staff: number;
  active: number;
  suspended: number;
}

export function countUsers(users: User[]): AdminUserCounts {
  return {
    total: users.length,
    platformAdmins: users.filter((u) => u.role === "platform_admin").length,
    superadmins: users.filter((u) => u.isSuperadmin).length,
    owners: users.filter((u) => u.role === "shop_owner").length,
    staff: users.filter((u) => u.role === "branch_staff").length,
    active: users.filter((u) => u.isActive).length,
    suspended: users.filter((u) => !u.isActive).length,
  };
}

export interface UserFilter {
  q?: string;
  role?: string; // platform_admin | superadmin | shop_owner | branch_staff
  shopId?: string;
  status?: string; // active | suspended
}

export function filterUsers(users: User[], f: UserFilter): User[] {
  const q = f.q?.trim().toLowerCase();
  return users.filter((u) => {
    if (q && !u.email.toLowerCase().includes(q) && u.id !== f.q?.trim()) return false;
    if (f.role === "superadmin" ? !u.isSuperadmin : f.role && u.role !== f.role) return false;
    if (f.shopId && u.shopId !== f.shopId) return false;
    if (f.status === "active" && !u.isActive) return false;
    if (f.status === "suspended" && u.isActive) return false;
    return true;
  });
}

/**
 * Server-side guards for /admin/users. Every mutation re-reads the actor and
 * the target from the DB (never trusts the client).
 */
export class AdminUserManagementUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly admin: IAdminUserRepository,
    private readonly sessions: ISessionRepository,
    private readonly branches: IBranchRepository,
  ) {}

  private async load(actorId: string, targetId: string) {
    const actor = await this.users.findById(actorId);
    if (!actor || !actor.isActive || actor.role !== "platform_admin") {
      throw new AdminUserError("forbidden");
    }
    const target = await this.users.findById(targetId);
    if (!target) throw new AdminUserError("not_found");
    return { actor, target };
  }

  private requireSuper(actor: User) {
    if (!actor.isSuperadmin) throw new AdminUserError("forbidden");
  }

  async suspend(actorId: string, targetId: string): Promise<User> {
    const { actor, target } = await this.load(actorId, targetId);
    if (actor.id === target.id) throw new AdminUserError("self");
    if (target.isSuperadmin) throw new AdminUserError("superadmin_protected");
    // Only a superadmin may suspend another platform admin.
    if (target.role === "platform_admin") this.requireSuper(actor);
    const u = await this.users.setActive(target.id, false);
    await this.sessions.deleteAllForUser(target.id);
    return u;
  }

  async activate(actorId: string, targetId: string): Promise<User> {
    const { actor, target } = await this.load(actorId, targetId);
    if (target.role === "platform_admin") this.requireSuper(actor);
    return this.users.setActive(target.id, true);
  }

  /** Switch a shop member between owner and staff (same shop). */
  async changeShopRole(
    actorId: string,
    targetId: string,
    role: "shop_owner" | "branch_staff",
    branchId?: string | null,
  ): Promise<User> {
    const { target } = await this.load(actorId, targetId);
    if (target.role === "platform_admin" || !target.shopId) {
      throw new AdminUserError("invalid_target");
    }
    if (role === "shop_owner") {
      return this.admin.setRole(target.id, "shop_owner", target.shopId, null);
    }
    if (!branchId) throw new AdminUserError("invalid_branch");
    const branch = await this.branches.findById(branchId);
    if (!branch || branch.shopId !== target.shopId) {
      throw new AdminUserError("invalid_branch");
    }
    return this.admin.setRole(target.id, "branch_staff", target.shopId, branch.id);
  }

  /** Superadmin only: make a shop user a platform admin. */
  async promoteToAdmin(actorId: string, targetId: string): Promise<User> {
    const { actor, target } = await this.load(actorId, targetId);
    this.requireSuper(actor);
    if (target.role === "platform_admin") throw new AdminUserError("invalid_target");
    const u = await this.admin.setRole(target.id, "platform_admin", null, null);
    await this.sessions.deleteAllForUser(target.id);
    return u;
  }

  /** Superadmin only: demote a (non-super) platform admin to owner of a shop. */
  async demoteAdmin(actorId: string, targetId: string, shopId: string): Promise<User> {
    const { actor, target } = await this.load(actorId, targetId);
    this.requireSuper(actor);
    if (actor.id === target.id) throw new AdminUserError("self");
    if (target.role !== "platform_admin") throw new AdminUserError("invalid_target");
    if (target.isSuperadmin) throw new AdminUserError("superadmin_protected");
    if (!shopId) throw new AdminUserError("invalid_target");
    const u = await this.admin.setRole(target.id, "shop_owner", shopId, null);
    await this.sessions.deleteAllForUser(target.id);
    return u;
  }

  async grantSuperadmin(actorId: string, targetId: string): Promise<User> {
    const { actor, target } = await this.load(actorId, targetId);
    this.requireSuper(actor);
    if (target.role !== "platform_admin" || !target.isActive) {
      throw new AdminUserError("invalid_target");
    }
    return this.admin.grantSuperadmin(target.id);
  }

  async revokeSuperadmin(actorId: string, targetId: string): Promise<User> {
    const { actor, target } = await this.load(actorId, targetId);
    this.requireSuper(actor);
    if (!target.isSuperadmin) throw new AdminUserError("invalid_target");
    const u = await this.admin.revokeSuperadminIfNotLast(target.id);
    if (!u) throw new AdminUserError("last_superadmin");
    return u;
  }
}
