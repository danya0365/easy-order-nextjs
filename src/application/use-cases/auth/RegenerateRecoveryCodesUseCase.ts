import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import { generateRecoveryCodes } from "./recovery-codes";

/**
 * Issue a fresh set of recovery codes (invalidating the old ones). Requires the
 * account password since it revokes the previous codes. Returns the new codes
 * in plaintext — shown once; only hashes are stored.
 */
export class RegenerateRecoveryCodesUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(userId: string, password: string): Promise<string[]> {
    const user = await this.users.findByIdWithSecret(userId);
    if (!user) throw new Error("ไม่พบบัญชีผู้ใช้");
    if (!(await this.hasher.compare(password, user.passwordHash))) {
      throw new Error("รหัสผ่านไม่ถูกต้อง");
    }
    const state = await this.users.getTotpState(userId);
    if (!state?.confirmedAt) throw new Error("ยังไม่ได้เปิดใช้งาน 2FA");

    const codes = generateRecoveryCodes();
    const hashes = await Promise.all(codes.map((c) => this.hasher.hash(c)));
    await this.users.setTotpRecoveryCodes(userId, hashes);
    return codes;
  }
}
