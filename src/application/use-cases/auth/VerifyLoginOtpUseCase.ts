import type { User } from "@/src/domain/entities";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import { MAX_OTP_ATTEMPTS } from "./login-otp";

/**
 * Verifies a login OTP. Returns the user on success (and clears the OTP), null
 * for a wrong/expired/missing code (wrong codes bump the attempt counter), and
 * throws once the account is locked after too many wrong tries.
 */
export class VerifyLoginOtpUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(
    email: string,
    otp: string,
    now: number = Date.now(),
  ): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.users.findByEmailWithSecret(normalizedEmail);
    if (!user || !user.isActive) return null;

    const state = await this.users.getLoginOtp(user.id);
    if (!state?.hash || !state.expiresAt) return null;
    if (new Date(state.expiresAt).getTime() <= now) return null;
    if (state.attempts >= MAX_OTP_ATTEMPTS) {
      throw new Error("ใส่รหัสผิดเกินกำหนด กรุณาขอรหัสใหม่");
    }

    const ok = await this.hasher.compare(otp.trim(), state.hash);
    if (!ok) {
      await this.users.bumpLoginOtpAttempts(user.id);
      return null;
    }

    await this.users.clearLoginOtp(user.id);
    const { passwordHash: _omit, ...clean } = user;
    void _omit;
    return clean;
  }
}
