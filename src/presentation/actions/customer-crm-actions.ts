"use server";

import { revalidatePath } from "next/cache";

import { container } from "@/src/infrastructure/di/container";
import { requireCrmActor } from "@/src/infrastructure/auth/crm-access";
import { assertCrmCan } from "@/src/domain/services/crm-permissions";
import type { CrmQuery } from "@/src/domain/services/customer-crm";
import {
  AdjustCustomerPointsUseCase,
  BlockCustomerUseCase,
  BulkCustomerUseCase,
  BULK_MAX,
} from "@/src/application/use-cases/customer/CustomerCrmUseCases";
import { RedeemPointsRewardUseCase } from "@/src/application/use-cases/loyalty/RedeemPointsRewardUseCase";
import { normalizeTags } from "@/src/domain/services/customer-crm";
import { AUDIT_ACTIONS } from "@/src/application/services/AuditLogger";
import { getClientIp } from "@/src/presentation/lib/request-ip";

export type CrmActionResult = { error?: string; done?: number; skipped?: number };

export type BulkTarget = { ids: string[] } | { query: CrmQuery };

/**
 * Bulk approve / block from the customers list — either the checked rows or
 * "all matching the current filter" (resolved server-side, capped at BULK_MAX).
 * Approve: owner or staff. Block: owner only.
 */
export async function bulkCustomerAction(op: "approve" | "block", target: BulkTarget): Promise<CrmActionResult> {
  try {
    const { actor, shopId, role } = await requireCrmActor();
    if (op !== "approve" && op !== "block") throw new Error("invalid op");
    assertCrmCan(role, op === "approve" ? "approve" : "bulkBlock");
    let ids: string[];
    if (target && "query" in target) {
      const q = target.query ?? {};
      const m = await container.customerCrmRepository.matchingIds(
        shopId,
        { tab: String(q.tab ?? ""), q: String(q.q ?? ""), channel: String(q.channel ?? ""), sort: String(q.sort ?? "") },
        BULK_MAX,
      );
      if (m.overCap) throw new Error(`เลือกได้สูงสุด ${BULK_MAX} รายการต่อครั้ง — กรุณากรองให้แคบลง`);
      ids = m.ids;
    } else {
      ids = target?.ids as string[];
      if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string")) throw new Error("invalid ids");
      if (ids.length > BULK_MAX) throw new Error(`เลือกได้สูงสุด ${BULK_MAX} รายการต่อครั้ง`);
    }
    const uc = new BulkCustomerUseCase(
      container.customerRepository,
      container.customerCrmRepository,
      container.memberSignupGuardRepository,
    );
    const r = op === "approve" ? await uc.approve(shopId, ids, actor.id) : await uc.block(shopId, ids, actor.id);
    const ip = await getClientIp();
    for (const id of r.done) {
      await container.auditLogger.record({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: op === "approve" ? AUDIT_ACTIONS.customerOnlineApproved : AUDIT_ACTIONS.customerBlocked,
        targetType: "customer",
        targetId: id,
        shopId,
        ip,
        metadata: { bulk: true, mode: "query" in (target ?? {}) ? "allMatching" : "ids" },
      });
    }
    revalidatePath("/shop/customers");
    revalidatePath("/staff/customers");
    return { done: r.done.length, skipped: r.skipped.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export type CustomerDetailOp =
  | { op: "profile"; displayName: string; note: string }
  | { op: "tags"; tags: string[] }
  | { op: "points"; delta: number; reason: string }
  | { op: "redeem"; rewardId: string }
  | { op: "block" }
  | { op: "unblock" }
  | { op: "clearNewMember" }
  | { op: "restoreNewMember" }
  | { op: "resetDevices" };

const NAME_MAX = 100;
const NOTE_MAX = 500;

/**
 * Single-customer CRM mutations from /shop/customers/[id].
 * Owner (or impersonating platform admin) only, shop-scoped, every success audit-logged.
 */
export async function customerDetailAction(
  customerId: string,
  input: CustomerDetailOp,
): Promise<{ error?: string; points?: number }> {
  try {
    const { actor, shopId, role } = await requireCrmActor();
    if (typeof customerId !== "string" || !customerId) throw new Error("invalid customer");
    const customer = await container.customerRepository.findById(shopId, customerId);
    if (!customer) throw new Error("ไม่พบลูกค้า");
    const crm = container.customerCrmRepository;
    let action: string;
    let metadata: Record<string, unknown> = {};
    let points: number | undefined;

    switch (input?.op) {
      case "profile": {
        const name = String(input.displayName ?? "").trim();
        const note = String(input.note ?? "").trim();
        if (name.length > NAME_MAX || note.length > NOTE_MAX) throw new Error("ข้อความยาวเกินไป");
        if (name !== (customer.displayName ?? "").trim()) assertCrmCan(role, "editName");
        assertCrmCan(role, "note");
        await crm.updateProfile(shopId, customer.id, { displayName: name || null, note: note || null });
        action = AUDIT_ACTIONS.customerProfileUpdated;
        metadata = {
          nameChanged: (customer.displayName ?? "") !== name,
          noteChanged: (customer.note ?? "") !== note,
        };
        break;
      }
      case "tags": {
        assertCrmCan(role, "tags");
        if (!Array.isArray(input.tags)) throw new Error("invalid tags");
        const tags = normalizeTags(input.tags.map(String));
        await crm.setTags(shopId, customer.id, tags);
        action = AUDIT_ACTIONS.customerTagsUpdated;
        metadata = { from: customer.tags ?? [], to: tags };
        break;
      }
      case "points": {
        assertCrmCan(role, "points");
        points = await new AdjustCustomerPointsUseCase(
          container.customerRepository,
          crm,
          container.loyaltyPointsTransactionRepository,
        ).execute({ shopId, customerId: customer.id, delta: Number(input.delta), reason: String(input.reason ?? ""), actorId: actor.id });
        action = AUDIT_ACTIONS.customerPointsAdjusted;
        metadata = { delta: Number(input.delta), reason: String(input.reason).trim(), balance: points };
        break;
      }
      case "redeem": {
        assertCrmCan(role, "redeem");
        const bal = await new RedeemPointsRewardUseCase(
          container.shopRepository,
          container.customerRepository,
          container.loyaltyPointsSettingsRepository,
          container.loyaltyPointsBalanceRepository,
          container.loyaltyPointsTransactionRepository,
          container.loyaltyPointsRewardRepository,
        ).execute({ shopId, phone: customer.phone, rewardId: String(input.rewardId ?? ""), performedBy: actor.id });
        points = bal.currentPoints;
        action = AUDIT_ACTIONS.customerPointsRedeemed;
        metadata = { rewardId: input.rewardId, balance: points };
        break;
      }
      case "block":
      case "unblock": {
        assertCrmCan(role, "block");
        const uc = new BlockCustomerUseCase(container.customerRepository, crm, container.memberSignupGuardRepository);
        if (input.op === "block") await uc.block(shopId, customer.id, actor.id);
        else await uc.unblock(shopId, customer.id);
        action = input.op === "block" ? AUDIT_ACTIONS.customerBlocked : AUDIT_ACTIONS.customerUnblocked;
        break;
      }
      case "clearNewMember":
      case "restoreNewMember": {
        assertCrmCan(role, "newMember");
        const on = input.op === "clearNewMember";
        await crm.setNewMemberCleared(shopId, customer.id, on ? new Date().toISOString() : null);
        action = AUDIT_ACTIONS.customerNewMemberCleared;
        metadata = { cleared: on };
        break;
      }
      case "resetDevices": {
        assertCrmCan(role, "resetDevices");
        await container.customerDeviceRepository.deleteByCustomer(customer.id);
        action = AUDIT_ACTIONS.customerDevicesReset;
        break;
      }
      default:
        throw new Error("invalid op");
    }

    await container.auditLogger.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action,
      targetType: "customer",
      targetId: customer.id,
      shopId,
      ip: await getClientIp(),
      metadata,
    });
    revalidatePath("/shop/customers");
    revalidatePath(`/shop/customers/${customer.id}`);
    revalidatePath(`/staff/customers/${customer.id}`);
    return { points };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
