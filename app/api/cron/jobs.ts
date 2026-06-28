import { container } from "@/src/infrastructure/di/container";
import { CleanOrphanedFilesUseCase } from "@/src/application/use-cases/maintenance/CleanOrphanedFilesUseCase";
import { ListDueFollowUpsUseCase } from "@/src/application/use-cases/lead/ListDueFollowUpsUseCase";

/**
 * A scheduled job. The registry below is run by the single `/api/cron`
 * dispatcher so the whole app fits within one Vercel cron slot (Hobby tier).
 * Each job can be toggled via its `envKey` (set to "off"/"false"/"0" to skip),
 * and triggered individually with `/api/cron?job=<id>` once you upgrade to a
 * plan with multiple cron schedules.
 */
export interface CronJob {
  id: string;
  /** Env var that disables this job when set to off/false/0. */
  envKey: string;
  /** Whether the job runs when its env var is unset. */
  defaultOn: boolean;
  run: () => Promise<unknown>;
}

export function isJobEnabled(job: CronJob): boolean {
  const v = process.env[job.envKey];
  if (v == null || v === "") return job.defaultOn;
  return !["off", "false", "0", "no"].includes(v.trim().toLowerCase());
}

/** Housekeeping: delete uploaded files no longer referenced by any DB row. */
async function runOrphanedFiles(): Promise<{
  scanned: number;
  deleted: number;
}> {
  // Menu item images ("menu/") and shop images ("shops/") live under prefixes
  // the cleanup scans, so their keys must be supplied as referenced — otherwise
  // every such photo would be treated as orphaned and deleted after the grace
  // window.
  const [menuImageKeys, shopImageKeys] = await Promise.all([
    container.menuItemRepository.allImageKeys(),
    container.shopImageRepository.allStorageKeys(),
  ]);
  return new CleanOrphanedFilesUseCase(
    container.paymentRepository,
    container.slipStorage,
  ).execute({ extraReferencedKeys: [...menuImageKeys, ...shopImageKeys] });
}

/**
 * Notify admins about leads whose follow-up date has passed. Idempotent: each
 * due lead is announced once (the repo filters out already-notified ones), and
 * we stamp them only AFTER a successful notify so a failure simply retries next
 * run (at-least-once) rather than silently dropping the reminder.
 */
async function runLeadFollowUps(): Promise<{ processed: number }> {
  const now = new Date().toISOString();
  const due = await new ListDueFollowUpsUseCase(container.leadRepository).execute(
    now,
  );
  if (due.length === 0) return { processed: 0 };

  await container.notificationService.notifyAdmins({
    type: "lead_follow_up_due",
    title: "ลีดถึงกำหนดติดตาม",
    body: `มี ${due.length} ลีดถึงกำหนดติดตามแล้ว — เปิดดูเพื่อวางแผนลงพื้นที่`,
    linkUrl: "/admin/leads",
  });
  await container.leadRepository.markFollowUpsNotified(
    due.map((l) => l.id),
    now,
  );
  return { processed: due.length };
}

/** Housekeeping: purge expired sessions so the table doesn't grow unbounded. */
async function runCleanup(): Promise<{ deletedSessions: number }> {
  const deletedSessions = await container.sessionRepository.deleteExpired(
    new Date(),
  );
  return { deletedSessions };
}

export const CRON_JOBS: CronJob[] = [
  {
    id: "lead-follow-ups",
    envKey: "CRON_LEAD_FOLLOWUPS",
    defaultOn: true,
    run: runLeadFollowUps,
  },
  {
    id: "cleanup",
    envKey: "CRON_CLEANUP",
    defaultOn: true,
    run: runCleanup,
  },
  {
    id: "orphaned-files",
    envKey: "CRON_ORPHANED_FILES",
    defaultOn: true,
    run: runOrphanedFiles,
  },
];
