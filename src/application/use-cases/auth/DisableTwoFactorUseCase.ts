import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

/** Turn off 2FA — requires re-entering the account password as a safety check. */
export class DisableTwoFactorUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(userId: string, password: string): Promise<void> {
    const user = await this.users.findByIdWithSecret(userId);
    if (!user) throw new Error("ไม่พบบัญชีผู้ใช้");
    if (!(await this.hasher.compare(password, user.passwordHash))) {
      throw new Error("รหัสผ่านไม่ถูกต้อง");
    }
    await this.users.disableTotp(userId);
  }
}
