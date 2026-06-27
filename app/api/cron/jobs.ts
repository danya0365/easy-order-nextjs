import { container } from "@/src/infrastructure/di/container";
import { CleanOrphanedFilesUseCase } from "@/src/application/use-cases/maintenance/CleanOrphanedFilesUseCase";

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
  return new CleanOrphanedFilesUseCase(
    container.paymentRepository,
    container.slipStorage,
  ).execute();
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
