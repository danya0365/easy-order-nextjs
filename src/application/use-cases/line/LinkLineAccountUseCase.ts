import type { IUserRepository } from "@/src/application/repositories/IUserRepository";

/** Resolve a link code (sent in LINE chat) to its user and bind their lineUserId. */
export class LinkLineAccountUseCase {
  constructor(private readonly users: IUserRepository) {}

  /** Returns the linked user's display email, or null if the code is unknown. */
  async execute(code: string, lineUserId: string): Promise<string | null> {
    const user = await this.users.findByLineLinkCode(code);
    if (!user) return null;
    await this.users.setLineUserId(user.id, lineUserId);
    await this.users.setLineLinkCode(user.id, null, null);
    return user.email;
  }
}
