import type { User } from "@/src/domain/entities";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

/** Verifies credentials. Returns the user on success, null otherwise. */
export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(email: string, password: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const record = await this.users.findByEmailWithSecret(normalizedEmail);
    if (!record || !record.isActive) return null;
    // OTP-only enforcement: owner/staff who linked LINE must sign in via OTP.
    // platform_admin keeps password as a break-glass fallback.
    if (record.lineUserId && record.role !== "platform_admin") return null;
    const ok = await this.hasher.compare(password, record.passwordHash);
    if (!ok) return null;
    const { passwordHash: _omit, ...user } = record;
    void _omit;
    return user;
  }
}
