import type { IUserRepository } from "@/src/application/repositories/IUserRepository";

/** Operator unlinks their LINE account (clears the linked id + any pending code). */
export class UnlinkLineAccountUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    await this.users.setLineUserId(userId, null);
    await this.users.setLineLinkCode(userId, null, null);
  }
}
