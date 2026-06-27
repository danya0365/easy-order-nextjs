import type { User } from "@/src/domain/entities";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { ISessionRepository } from "@/src/application/repositories/ISessionRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import type { IPasswordBreachChecker } from "@/src/application/services/IPasswordBreachChecker";
import { assertPasswordAcceptable } from "./password-policy";

/**
 * A privileged user sets a NEW password for someone else (no current password
 * needed). Authorization (who may reset whom) is enforced by the caller.
 */
export class ResetPasswordUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly sessions: ISessionRepository,
    private readonly breachChecker: IPasswordBreachChecker,
  ) {}

  async execute(targetUserId: string, newPassword: string): Promise<User> {
    await assertPasswordAcceptable(newPassword, this.breachChecker);
    const passwordHash = await this.hasher.hash(newPassword);
    const user = await this.users.updatePassword(targetUserId, passwordHash);
    // A reset implies the account may be compromised — kill all its sessions.
    await this.sessions.deleteAllForUser(targetUserId);
    return user;
  }
}
