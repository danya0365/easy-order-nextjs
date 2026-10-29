import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { IMemberSignupGuardRepository } from "@/src/application/repositories/IMemberSignupGuardRepository";
import type { Customer } from "@/src/domain/entities";
import { STATIC_JOIN_POLICY } from "@/src/domain/services/static-join-guard";

export interface PendingMemberFlags {
  /** Same ip_hash produced >1 signup at this shop in the last 24h. */
  sameIp: boolean;
  /** This phone was rejected by the shop before. */
  previouslyRejected: boolean;
  /** Same device produced >1 signup at this shop in the last 24h. */
  multiDevice: boolean;
}

export interface PendingMemberRequest {
  customer: Customer;
  flags: PendingMemberFlags;
  suspicious: boolean;
}

/** Pending static-QR requests with spam signals; suspicious sorted last. */
export class ListPendingMemberRequestsUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly guard: IMemberSignupGuardRepository,
  ) {}

  async execute(
    shopId: string,
    now: Date = new Date(),
  ): Promise<PendingMemberRequest[]> {
    const pending = await this.customers.listPendingOnlineOrder(shopId);
    if (pending.length === 0) return [];
    const since = new Date(
      now.getTime() - STATIC_JOIN_POLICY.signalWindowMs,
    ).toISOString();
    const [recent, mine] = await Promise.all([
      this.guard.listSince(shopId, since),
      this.guard.listByCustomers(
        shopId,
        pending.map((c) => c.id),
      ),
    ]);
    const ipCount = new Map<string, number>();
    const devCount = new Map<string, number>();
    for (const a of recent) {
      if (a.ipHash) ipCount.set(a.ipHash, (ipCount.get(a.ipHash) ?? 0) + 1);
      if (a.deviceId)
        devCount.set(a.deviceId, (devCount.get(a.deviceId) ?? 0) + 1);
    }
    // listByCustomers is newest-first → first hit per customer is latest.
    const latest = new Map<string, (typeof mine)[number]>();
    for (const a of mine) {
      if (a.customerId && !latest.has(a.customerId)) latest.set(a.customerId, a);
    }

    const out = pending.map((customer) => {
      const a = latest.get(customer.id);
      const flags: PendingMemberFlags = {
        sameIp: !!a?.ipHash && (ipCount.get(a.ipHash) ?? 0) > 1,
        previouslyRejected: !!customer.onlineOrderRejectedAt,
        multiDevice: !!a?.deviceId && (devCount.get(a.deviceId) ?? 0) > 1,
      };
      const suspicious =
        flags.sameIp || flags.previouslyRejected || flags.multiDevice;
      return { customer, flags, suspicious };
    });
    // Stable: non-suspicious first, original (newest-first) order within groups.
    return [
      ...out.filter((r) => !r.suspicious),
      ...out.filter((r) => r.suspicious),
    ];
  }
}
