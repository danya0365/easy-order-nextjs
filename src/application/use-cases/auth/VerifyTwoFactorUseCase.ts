import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import type { ITotpService } from "@/src/application/services/ITotpService";
import { normalizeRecoveryCode } from "./recovery-codes";

/**
 * Verify a 2FA challenge at login: a current TOTP code, or a single-use recovery
 * code (consumed on success). Returns false if 2FA isn't active or nothing matches.
 */
export class VerifyTwoFactorUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly totp: ITotpService,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(userId: string, code: string): Promise<boolean> {
    const state = await this.users.getTotpState(userId);
    if (!state?.secret || !state.confirmedAt) return false; // 2FA not active

    if (this.totp.verify(state.secret, code)) return true;

    // Fall back to a recovery code (consume it on match).
    const normalized = normalizeRecoveryCode(code);
    for (let i = 0; i < state.recoveryCodes.length; i++) {
      if (await this.hasher.compare(normalized, state.recoveryCodes[i])) {
        const remaining = state.recoveryCodes.filter((_, j) => j !== i);
        await this.users.setTotpRecoveryCodes(userId, remaining);
        return true;
      }
    }
    return false;
  }
}
