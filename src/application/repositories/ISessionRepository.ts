import type { Session, User } from "@/src/domain/entities";

export interface CreateSessionInput {
  userId: string;
  expiresAt: string;
  userAgent?: string | null;
  ip?: string | null;
}

export interface ISessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  /** Returns the session + its (active) user when the token is valid and unexpired. */
  findValid(token: string, now: Date): Promise<{ session: Session; user: User } | null>;
  delete(token: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  /** A user's active (unexpired) sessions, newest first — for the devices list. */
  listByUser(userId: string, now: Date): Promise<Session[]>;
  /** Delete one session by id, scoped to its owner (can't revoke someone else's). */
  deleteById(id: string, userId: string): Promise<void>;
  /** Purge all sessions whose expiry has passed. Returns the number removed. */
  deleteExpired(now: Date): Promise<number>;
}
