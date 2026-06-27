import type { ISubscriptionRepository } from "@/src/application/repositories/ISubscriptionRepository";
import { resumeDueDate } from "@/src/domain/services/subscription-status";

/**
 * Resume a paused shop: clear the pause and push the due date forward by the
 * whole days it was paused (see resumeDueDate). Returns true when it actually
 * unpaused, false when the shop wasn't paused (no-op) — callers use this to
 * decide whether to audit-log the resume.
 */
export class ResumeShopUseCase {
  constructor(private readonly subscriptions: ISubscriptionRepository) {}

  async execute(shopId: string, now: Date = new Date()): Promise<boolean> {
    const sub = await this.subscriptions.findByShop(shopId);
    if (!sub) throw new Error("ไม่พบข้อมูลการใช้งานของร้าน");
    if (!sub.pausedAt) return false; // not paused — no-op

    const newDue = resumeDueDate(sub.currentPeriodDueAt, sub.pausedAt, now);
    await this.subscriptions.resume(sub.id, newDue);
    return true;
  }
}
