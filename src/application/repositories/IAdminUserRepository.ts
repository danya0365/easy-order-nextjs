import type { User } from "@/src/domain/entities";
import type { Role } from "@/src/domain/types/roles";

/** Admin-only user management writes (superadmin + role changes). */
export interface IAdminUserRepository {
  setRole(
    id: string,
    role: Role,
    shopId: string | null,
    branchId: string | null,
  ): Promise<User>;
  /** Set the superadmin flag. Grant always succeeds for an existing row. */
  grantSuperadmin(id: string): Promise<User>;
  /**
   * Atomically clear the flag ONLY if another active superadmin remains.
   * Returns null when the guard refused (last superadmin).
   */
  revokeSuperadminIfNotLast(id: string): Promise<User | null>;
  countActiveSuperadmins(): Promise<number>;
}
