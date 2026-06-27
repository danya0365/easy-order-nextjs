import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import type { ITotpService } from "@/src/application/services/ITotpService";
import { generateRecoveryCodes } from "./recovery-codes";

/**
 * Finish 2FA enrollment: verify a code from the authenticator against the pending
 * secret, then activate 2FA and return fresh recovery codes (shown ONCE — only
 * their bcrypt hashes are stored).
 */
export class ConfirmTwoFactorSetupUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly totp: ITotpService,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(userId: string, code: string): Promise<string[]> {
    const state = await this.users.getTotpState(userId);
    if (!state?.secret) throw new Error("ยังไม่ได้เริ่มตั้งค่า 2FA");
    if (state.confirmedAt) throw new Error("2FA เปิดใช้งานอยู่แล้ว");
    if (!this.totp.verify(state.secret, code)) {
      throw new Error("รหัสยืนยันไม่ถูกต้อง");
    }
    const codes = generateRecoveryCodes();
    const hashes = await Promise.all(codes.map((c) => this.hasher.hash(c)));
    await this.users.enableTotp(userId, hashes);
    return codes;
  }
}
