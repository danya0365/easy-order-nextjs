export type AdminLoginLinkKind = "shop" | "admin";

export interface AdminLoginLink {
  id: string;
  kind: AdminLoginLinkKind;
  /** null for kind 'admin'. */
  shopId: string | null;
  tokenHash: string;
  createdBy: string;
  targetUserId: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByUserId: string | null;
  revokedAt: string | null;
}

export interface CreateAdminLoginLinkInput {
  kind?: AdminLoginLinkKind;
  shopId: string | null;
  tokenHash: string;
  createdBy: string;
  targetUserId: string | null;
  expiresAt: string;
}

export interface IAdminLoginLinkRepository {
  create(input: CreateAdminLoginLinkInput): Promise<AdminLoginLink>;
  findByTokenHash(tokenHash: string): Promise<AdminLoginLink | null>;
  findById(id: string): Promise<AdminLoginLink | null>;
  /** Not used, not revoked, not expired (as of nowIso). */
  listActive(nowIso: string): Promise<AdminLoginLink[]>;
  /** Most recent used or revoked links (history). */
  listRecentClosed(limit: number): Promise<AdminLoginLink[]>;
  /** Revoke if still unused; true when a row changed. */
  revoke(id: string, nowIso: string): Promise<boolean>;
  /** Atomic single-use claim; true only for the one caller that wins. */
  consume(id: string, userId: string, nowIso: string): Promise<boolean>;
}
