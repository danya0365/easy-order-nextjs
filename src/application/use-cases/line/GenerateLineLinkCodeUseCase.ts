import { customAlphabet } from "nanoid";

import type { IUserRepository } from "@/src/application/repositories/IUserRepository";

// Unambiguous code (no 0/O/1/I) so it's easy to type into the LINE chat.
export const LINE_LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LINE_LINK_CODE_LENGTH = 6;
const makeCode = customAlphabet(LINE_LINK_CODE_ALPHABET, LINE_LINK_CODE_LENGTH);

const CODE_SHAPE = new RegExp(
  `^[${LINE_LINK_CODE_ALPHABET}]{${LINE_LINK_CODE_LENGTH}}$`,
);

/**
 * True when a (trimmed, upper-cased) string looks like a link code. The LINE
 * webhook uses this to tell a link attempt apart from ordinary chat, so general
 * customer messages don't get a "code not found" reply.
 */
export function isLineLinkCodeShape(text: string): boolean {
  return CODE_SHAPE.test(text);
}

/** How long a generated link code stays valid (anti-brute-force). */
const CODE_TTL_MS = 10 * 60_000; // 10 นาที

/** Generate (and store) a one-time, short-lived code the operator sends in LINE chat to link. */
export class GenerateLineLinkCodeUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(userId: string): Promise<string> {
    // Regenerate on the (astronomically rare) chance of colliding with another
    // user's still-valid code, so a code maps to exactly one account.
    let code = makeCode();
    for (let i = 0; i < 5 && (await this.users.findByLineLinkCode(code)); i++) {
      code = makeCode();
    }
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    await this.users.setLineLinkCode(userId, code, expiresAt);
    return code;
  }
}
