import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { ICustomerCrmRepository } from "@/src/application/repositories/ICustomerCrmRepository";
import type { IMemberSignupGuardRepository } from "@/src/application/repositories/IMemberSignupGuardRepository";
import { ApproveOnlineMemberUseCase } from "@/src/application/use-cases/member/ApproveOnlineMemberUseCase";

export const BULK_MAX = 200;

export interface BulkResult {
  done: string[];
  skipped: string[];
}

/** Block: no ordering, phone blocked from static-QR re-signup, pending -> rejected. */
export class BlockCustomerUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly crm: ICustomerCrmRepository,
    private readonly guard: IMemberSignupGuardRepository,
  ) {}

  async block(shopId: string, customerId: string, actorId: string): Promise<void> {
    const c = await this.customers.findById(shopId, customerId);
    if (!c) throw new Error("ไม่พบลูกค้า");
    await this.crm.setBlocked(shopId, c.id, actorId);
    await this.guard.blockPhone(shopId, c.phone, actorId);
    if (c.onlineOrderStatus === "pending") {
      await this.customers.setOnlineOrderStatus(shopId, c.id, "rejected", actorId, new Date().toISOString());
    }
  }

  async unblock(shopId: string, customerId: string): Promise<void> {
    const c = await this.customers.findById(shopId, customerId);
    if (!c) throw new Error("ไม่พบลูกค้า");
    await this.crm.setBlocked(shopId, c.id, null);
    await this.guard.unblockPhone(shopId, c.phone);
  }
}

/** Bulk approve / block. Foreign or ineligible ids are skipped, never touched. */
export class BulkCustomerUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly crm: ICustomerCrmRepository,
    private readonly guard: IMemberSignupGuardRepository,
  ) {}

  private async own(shopId: string, ids: string[]) {
    const uniq = [...new Set(ids)].slice(0, BULK_MAX);
    const own = new Set(await this.crm.filterOwnIds(shopId, uniq));
    return { own: uniq.filter((i) => own.has(i)), foreign: uniq.filter((i) => !own.has(i)) };
  }

  async approve(shopId: string, ids: string[], actorId: string): Promise<BulkResult> {
    const { own, foreign } = await this.own(shopId, ids);
    const uc = new ApproveOnlineMemberUseCase(this.customers);
    const done: string[] = [];
    const skipped = [...foreign];
    for (const id of own) {
      try {
        await uc.execute(shopId, id, actorId);
        done.push(id);
      } catch {
        skipped.push(id);
      }
    }
    return { done, skipped };
  }

  async block(shopId: string, ids: string[], actorId: string): Promise<BulkResult> {
    const { own, foreign } = await this.own(shopId, ids);
    const uc = new BlockCustomerUseCase(this.customers, this.crm, this.guard);
    for (const id of own) await uc.block(shopId, id, actorId);
    return { done: own, skipped: foreign };
  }
}
