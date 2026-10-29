import type { IShopRepository } from "@/src/application/repositories/IShopRepository";
import type { ICustomerRepository } from "@/src/application/repositories/ICustomerRepository";
import type { IMemberSignupGuardRepository } from "@/src/application/repositories/IMemberSignupGuardRepository";
import { generateStaticJoinToken } from "@/src/domain/services/static-join-guard";
import { ListPendingMemberRequestsUseCase } from "./ListPendingMemberRequestsUseCase";

/** Revoke the printed static QR: new random `k`, old one stops working. */
export class RotateStaticJoinTokenUseCase {
  constructor(private readonly shops: IShopRepository) {}
  async execute(shopId: string): Promise<void> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new Error("ไม่พบร้านค้า");
    await this.shops.rotateStaticJoinToken(
      shopId,
      generateStaticJoinToken(),
      new Date().toISOString(),
    );
  }
}

/** Pause / resume new static-QR signups. */
export class SetMemberSignupPausedUseCase {
  constructor(private readonly shops: IShopRepository) {}
  async execute(shopId: string, paused: boolean): Promise<void> {
    await this.shops.updateSettings(shopId, { memberSignupPaused: paused });
  }
}

/** Reject every pending request flagged suspicious. Returns count rejected. */
export class RejectSuspiciousMembersUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly guard: IMemberSignupGuardRepository,
  ) {}
  async execute(shopId: string, reviewerId: string): Promise<string[]> {
    const list = await new ListPendingMemberRequestsUseCase(
      this.customers,
      this.guard,
    ).execute(shopId);
    const ids: string[] = [];
    const nowIso = new Date().toISOString();
    for (const r of list) {
      if (!r.suspicious) continue;
      await this.customers.setOnlineOrderStatus(
        shopId,
        r.customer.id,
        "rejected",
        reviewerId,
        nowIso,
      );
      ids.push(r.customer.id);
    }
    return ids;
  }
}

/** Block a customer's phone at this shop (and reject if pending). */
export class BlockMemberPhoneUseCase {
  constructor(
    private readonly customers: ICustomerRepository,
    private readonly guard: IMemberSignupGuardRepository,
  ) {}
  async execute(
    shopId: string,
    customerId: string,
    reviewerId: string,
  ): Promise<void> {
    const c = await this.customers.findById(shopId, customerId);
    if (!c) throw new Error("ไม่พบลูกค้า");
    await this.guard.blockPhone(shopId, c.phone, reviewerId);
    if (c.onlineOrderStatus === "pending") {
      await this.customers.setOnlineOrderStatus(
        shopId,
        customerId,
        "rejected",
        reviewerId,
        new Date().toISOString(),
      );
    }
  }
}
