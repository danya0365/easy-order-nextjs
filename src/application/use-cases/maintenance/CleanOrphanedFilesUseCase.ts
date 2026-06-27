import type { IPaymentRepository } from "@/src/application/repositories/IPaymentRepository";
import type { ISlipStorage } from "@/src/application/services/ISlipStorage";

/** Key prefixes the app writes under — every managed object lives below one. */
const NAMESPACES = ["slips/", "menu/"] as const;

/**
 * Grace period: never delete an object younger than this. An upload writes the
 * blob *before* committing its DB row, so a brand-new file can momentarily look
 * "unreferenced". The window keeps cleanup from racing in-flight uploads.
 */
const DEFAULT_MIN_AGE_MS = 24 * 60 * 60 * 1000;

export interface CleanOrphanedFilesOptions {
  now?: Date;
  /** Spare objects modified within this many ms (default 24h). */
  minAgeMs?: number;
  /** Storage keys still referenced by domain rows (e.g. menu item images). */
  extraReferencedKeys?: Iterable<string>;
}

/**
 * Delete uploaded files no longer referenced by any DB row (e.g. a payment slip
 * whose owner row is gone, or a replaced menu image). Fails closed: the full set
 * of referenced keys is gathered up front, so if any lookup throws nothing is
 * deleted. Best-effort and idempotent.
 */
export class CleanOrphanedFilesUseCase {
  constructor(
    private readonly payments: IPaymentRepository,
    private readonly storage: ISlipStorage,
  ) {}

  async execute(
    opts: CleanOrphanedFilesOptions = {},
  ): Promise<{ scanned: number; deleted: number }> {
    const now = opts.now ?? new Date();
    const minAgeMs = opts.minAgeMs ?? DEFAULT_MIN_AGE_MS;
    const cutoff = now.getTime() - minAgeMs;

    // Gather all referenced keys first — if any of these throw we abort before
    // deleting anything (fail closed: a partial reference set would over-delete).
    const referenced = new Set<string>([
      ...(await this.payments.allSlipKeys()),
      ...(opts.extraReferencedKeys ?? []),
    ]);

    let scanned = 0;
    let deleted = 0;
    for (const prefix of NAMESPACES) {
      const objects = await this.storage.list(prefix);
      for (const obj of objects) {
        scanned++;
        if (referenced.has(obj.key)) continue;
        if (obj.lastModified.getTime() > cutoff) continue; // too new — spare it
        await this.storage.delete(obj.key);
        deleted++;
      }
    }
    return { scanned, deleted };
  }
}
