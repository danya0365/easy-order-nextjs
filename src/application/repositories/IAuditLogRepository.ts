import type { AuditLog } from "@/src/domain/entities";
import type { Role } from "@/src/domain/types/roles";
import type { Page, PageOpts } from "./pagination";

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  actorRole?: Role | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  shopId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Serialized to JSON by the repository. */
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogFilter {
  shopId?: string;
  actorUserId?: string;
  action?: string;
}

export interface CountRecentOpts {
  actorUserId?: string;
  ip?: string;
}

export interface IAuditLogRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  /** Cursor-paginated, newest first, optionally filtered (admin audit page). */
  page(filter: AuditLogFilter, opts?: PageOpts): Promise<Page<AuditLog>>;
  /** A single shop's events, newest first (per-shop drill-down). */
  pageByShop(shopId: string, opts?: PageOpts): Promise<Page<AuditLog>>;
  /**
   * How many events of `action` happened since `sinceISO`, optionally narrowed
   * to an actor or IP — used for brute-force / abuse-velocity detection.
   */
  countRecent(
    action: string,
    sinceISO: string,
    opts?: CountRecentOpts,
  ): Promise<number>;
}
