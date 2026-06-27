import type { User } from "@/src/domain/entities";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { ISessionRepository } from "@/src/application/repositories/ISessionRepository";

/**
 * Break-glass: one platform admin clears another admin's 2FA (lost device +
 * recovery codes). The target's 2FA is removed and all their sessions are killed,
 * so on next login they re-enroll (2FA is mandatory). Authorization (admin-only,
 * not self) is enforced by the caller.
 */
export class ResetPeerTwoFactorUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions: ISessionRepository,
  ) {}

  async execute(targetUserId: string): Promise<User> {
    const target = await this.users.findById(targetUserId);
    if (!target || target.role !== "platform_admin") {
      throw new Error("ไม่พบบัญชีผู้ดูแลระบบ");
    }
    await this.users.disableTotp(targetUserId);
    await this.sessions.deleteAllForUser(targetUserId);
    return target;
  }
}
