import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { ITotpService } from "@/src/application/services/ITotpService";

/** Start 2FA enrollment: generate + store a pending secret, return it + the QR URI. */
export class BeginTwoFactorSetupUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly totp: ITotpService,
  ) {}

  async execute(
    userId: string,
    accountLabel: string,
  ): Promise<{ secret: string; uri: string }> {
    const secret = this.totp.generateSecret();
    await this.users.setTotpSecret(userId, secret);
    return { secret, uri: this.totp.keyUri(secret, accountLabel) };
  }
}
