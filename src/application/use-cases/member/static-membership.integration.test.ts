import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { db, schema } from "@/src/infrastructure/db/client";
import { eq } from "drizzle-orm";
import {
  RegisterStaticMemberUseCase,
  type RegisterStaticMemberContext,
} from "./RegisterStaticMemberUseCase";
import { ResolveStaticJoinGateUseCase } from "./ResolveStaticJoinGateUseCase";
import { ApproveOnlineMemberUseCase } from "./ApproveOnlineMemberUseCase";
import { RejectOnlineMemberUseCase } from "./RejectOnlineMemberUseCase";
import { ListPendingMemberRequestsUseCase } from "./ListPendingMemberRequestsUseCase";
import {
  BlockMemberPhoneUseCase,
  RejectSuspiciousMembersUseCase,
  RotateStaticJoinTokenUseCase,
  SetMemberSignupPausedUseCase,
} from "./StaticJoinModerationUseCases";
import { CreateMenuCategoryUseCase } from "@/src/application/use-cases/menu/CreateMenuCategoryUseCase";
import { CreateMenuItemUseCase } from "@/src/application/use-cases/menu/CreateMenuItemUseCase";
import { PlaceOrderUseCase } from "@/src/application/use-cases/order/PlaceOrderUseCase";
import {
  isSuspiciousPhone,
  isValidThaiMobile,
} from "@/src/domain/services/static-join-guard";

const register = () =>
  new RegisterStaticMemberUseCase(
    container.shopRepository,
    container.customerRepository,
    container.customerDeviceRepository,
    container.memberSignupGuardRepository,
  );
const resolve = () =>
  new ResolveStaticJoinGateUseCase(
    container.shopRepository,
    container.customerDeviceRepository,
  );

async function onlineShop(slug: string) {
  const seeded = await seedShop(slug);
  await container.shopRepository.updateSettings(seeded.shop.id, {
    onlineOrderingEnabled: true,
  });
  const k = (await container.shopRepository.getStaticJoinToken(
    seeded.shop.id,
  ))!;
  return { ...seeded, k };
}

let ipSeq = 0;
/** Unique source per call so per-device limits don't interfere. */
function ctx(k: string, extra: Partial<RegisterStaticMemberContext> = {}) {
  ipSeq++;
  return { joinKey: k, ipHash: `ip-${ipSeq}`, deviceId: `dev-${ipSeq}`, ...extra };
}

describe("static QR membership", () => {
  before(async () => {
    await migrateTestDb();
  });

  it("phone validation: Thai mobile + junk patterns", () => {
    assert.ok(isValidThaiMobile("0861234957"));
    assert.ok(!isValidThaiMobile("0212345678"));
    assert.ok(!isValidThaiMobile("086123495"));
    for (const bad of [
      "0888888888",
      "0812345678",
      "0123456789",
      "0899999999",
      "0812121212",
      "0898989898",
      "0987654321",
    ]) {
      assert.ok(isSuspiciousPhone(bad), bad);
    }
    assert.ok(!isSuspiciousPhone("0861234957"));
  });

  it("register → pending → approve unlocks approved gate", async () => {
    const { shop, ownerId, k } = await onlineShop("static-join-ok");
    assert.ok(k.length >= 32, "token ≥ 24 bytes base64url");

    const noToken = await resolve().execute(shop.slug, null, k);
    assert.equal(noToken.kind, "needs_register");

    const { token, customer } = await register().execute(
      shop.slug,
      "แดน",
      "0861234957",
      undefined,
      ctx(k),
    );
    assert.equal(customer.onlineOrderStatus, "pending");

    assert.equal((await resolve().execute(shop.slug, token)).kind, "pending");

    const pendingList =
      await container.customerRepository.listPendingOnlineOrder(shop.id);
    assert.equal(pendingList.length, 1);

    await new ApproveOnlineMemberUseCase(container.customerRepository).execute(
      shop.id,
      customer.id,
      ownerId,
    );
    const approvedGate = await resolve().execute(shop.slug, token);
    assert.equal(approvedGate.kind, "approved");
  });

  it("missing/wrong k → invalid_qr; existing member passes without k", async () => {
    const { shop, ownerId, k } = await onlineShop("static-join-key");
    assert.equal((await resolve().execute(shop.slug, null)).kind, "invalid_qr");
    assert.equal(
      (await resolve().execute(shop.slug, null, "nope")).kind,
      "invalid_qr",
    );
    await assert.rejects(
      () => register().execute(shop.slug, "A", "0861234957", undefined, ctx("bad")),
      /QR/,
    );
    const { token, customer } = await register().execute(
      shop.slug,
      "A",
      "0861234957",
      undefined,
      ctx(k),
    );
    await new ApproveOnlineMemberUseCase(container.customerRepository).execute(
      shop.id,
      customer.id,
      ownerId,
    );
    // Member cookie but no k → still approved.
    assert.equal((await resolve().execute(shop.slug, token, null)).kind, "approved");
  });

  it("rotate token revokes old k", async () => {
    const { shop, k } = await onlineShop("static-join-rot");
    await new RotateStaticJoinTokenUseCase(container.shopRepository).execute(
      shop.id,
    );
    const k2 = (await container.shopRepository.getStaticJoinToken(shop.id))!;
    assert.notEqual(k, k2);
    assert.equal((await resolve().execute(shop.slug, null, k)).kind, "invalid_qr");
    assert.equal(
      (await resolve().execute(shop.slug, null, k2)).kind,
      "needs_register",
    );
    await assert.rejects(
      () => register().execute(shop.slug, "A", "0861234957", undefined, ctx(k)),
      /QR/,
    );
  });

  it("pause signups blocks new registration only", async () => {
    const { shop, ownerId, k } = await onlineShop("static-join-pause");
    const { token, customer } = await register().execute(
      shop.slug,
      "A",
      "0861234957",
      undefined,
      ctx(k),
    );
    await new ApproveOnlineMemberUseCase(container.customerRepository).execute(
      shop.id,
      customer.id,
      ownerId,
    );
    await new SetMemberSignupPausedUseCase(container.shopRepository).execute(
      shop.id,
      true,
    );
    assert.equal((await resolve().execute(shop.slug, null, k)).kind, "signup_paused");
    assert.equal((await resolve().execute(shop.slug, token)).kind, "approved");
    await assert.rejects(
      () => register().execute(shop.slug, "B", "0861234958", undefined, ctx(k)),
      /ปิดรับสมาชิกใหม่/,
    );
  });

  it("rejects bad phones", async () => {
    const { shop, k } = await onlineShop("static-join-phone");
    for (const p of ["0812345678", "0888888888", "021234567", "12345"]) {
      await assert.rejects(
        () => register().execute(shop.slug, "A", p, undefined, ctx(k)),
        /เบอร์มือถือไม่ถูกต้อง/,
        p,
      );
    }
  });

  it("per device/IP max 3 signups per day", async () => {
    const { shop, k } = await onlineShop("static-join-rate");
    const same = { joinKey: k, ipHash: "same-ip", deviceId: "same-dev" };
    for (const p of ["0861234901", "0861234902", "0861234903"]) {
      await register().execute(shop.slug, "A", p, undefined, same);
    }
    await assert.rejects(
      () => register().execute(shop.slug, "A", "0861234904", undefined, same),
      /บ่อยเกินไป/,
    );
    // Same IP, different device → still limited (IP OR device).
    await assert.rejects(
      () =>
        register().execute(shop.slug, "A", "0861234905", undefined, {
          ...same,
          deviceId: "other",
        }),
      /บ่อยเกินไป/,
    );
  });

  it("max 20 open pending per shop", async () => {
    const { shop, k } = await onlineShop("static-join-queue");
    for (let i = 0; i < 20; i++) {
      const p = `09${String(31415900 + i * 7).padStart(8, "0")}`;
      await register().execute(shop.slug, "A", p, undefined, ctx(k));
    }
    await assert.rejects(
      () => register().execute(shop.slug, "A", "0951357924", undefined, ctx(k)),
      /ร้านมีคำขอค้างมาก ลองใหม่ภายหลัง/,
    );
  });

  it("pending expires after 48h and is hidden from queue", async () => {
    const { shop, k } = await onlineShop("static-join-exp");
    const { token, customer } = await register().execute(
      shop.slug,
      "A",
      "0861234957",
      undefined,
      ctx(k),
    );
    const old = new Date(Date.now() - 49 * 3600_000).toISOString();
    await db
      .update(schema.customers)
      .set({ onlineOrderRequestedAt: old })
      .where(eq(schema.customers.id, customer.id));
    // Gate treats it as expired → back to register (with valid k).
    assert.equal(
      (await resolve().execute(shop.slug, token, k)).kind,
      "needs_register",
    );
    const list = await container.customerRepository.listPendingOnlineOrder(shop.id);
    assert.equal(list.length, 0);
    const after = await container.customerRepository.findById(shop.id, customer.id);
    assert.equal(after?.onlineOrderStatus, "expired");
  });

  it("reject → 30-day cooldown; block phone; queue signals", async () => {
    const { shop, ownerId, k } = await onlineShop("static-join-rej");
    const { token, customer } = await register().execute(
      shop.slug,
      "Test",
      "0861234957",
      undefined,
      ctx(k),
    );
    await new RejectOnlineMemberUseCase(container.customerRepository).execute(
      shop.id,
      customer.id,
      ownerId,
    );
    assert.equal((await resolve().execute(shop.slug, token)).kind, "rejected");
    await assert.rejects(
      () => register().execute(shop.slug, "Test", "0861234957", undefined, ctx(k)),
      /30 วัน/,
    );

    // Signals: same IP twice → suspicious, sorted last.
    await register().execute(shop.slug, "Clean", "0861111957", undefined, ctx(k));
    const s1 = { joinKey: k, ipHash: "spam-ip", deviceId: "d1" };
    const s2 = { joinKey: k, ipHash: "spam-ip", deviceId: "d2" };
    await register().execute(shop.slug, "S1", "0862222957", undefined, s1);
    const spam2 = await register().execute(shop.slug, "S2", "0863333957", undefined, s2);
    const list = await new ListPendingMemberRequestsUseCase(
      container.customerRepository,
      container.memberSignupGuardRepository,
    ).execute(shop.id);
    assert.equal(list.length, 3);
    assert.equal(list[0].customer.displayName, "Clean");
    assert.equal(list[0].suspicious, false);
    assert.ok(list[1].suspicious && list[1].flags.sameIp);
    assert.ok(list[2].suspicious);

    // Block one phone → cannot register again.
    await new BlockMemberPhoneUseCase(
      container.customerRepository,
      container.memberSignupGuardRepository,
    ).execute(shop.id, spam2.customer.id, ownerId);
    await assert.rejects(
      () => register().execute(shop.slug, "S2", "0863333957", undefined, ctx(k)),
      /ไม่สามารถลงทะเบียน/,
    );

    const rejected = await new RejectSuspiciousMembersUseCase(
      container.customerRepository,
      container.memberSignupGuardRepository,
    ).execute(shop.id, ownerId);
    assert.equal(rejected.length, 1);
    const remaining = await container.customerRepository.listPendingOnlineOrder(
      shop.id,
    );
    assert.deepEqual(
      remaining.map((c) => c.displayName),
      ["Clean"],
    );
  });

  it("OTP-enabled shop requires non-empty otp (stub)", async () => {
    const { shop, k } = await onlineShop("static-join-otp");
    await container.shopRepository.updateSettings(shop.id, {
      memberOtpEnabled: true,
    });
    await assert.rejects(
      () => register().execute(shop.slug, "A", "0861234957", undefined, ctx(k)),
      /OTP/,
    );
    const ok = await register().execute(
      shop.slug,
      "A",
      "0861234957",
      "123456",
      ctx(k),
    );
    assert.equal(ok.customer.onlineOrderStatus, "pending");
  });

  it("ordering_off when online ordering disabled", async () => {
    const { shop } = await seedShop("static-join-off");
    const gate = await resolve().execute(shop.slug, null);
    assert.equal(gate.kind, "ordering_off");
  });

  it("new static member: 1 open order + 1000 THB cap until first finished", async () => {
    const { shop, ownerId, k } = await onlineShop("static-join-limits");
    const cat = await new CreateMenuCategoryUseCase(
      container.menuCategoryRepository,
    ).execute(shop.id, "อาหาร");
    const item = await new CreateMenuItemUseCase(
      container.menuItemRepository,
      container.menuCategoryRepository,
    ).execute({
      shopId: shop.id,
      categoryId: cat.id,
      name: "ข้าว",
      priceSatang: 30_000,
    });
    const phone = "0861234957";
    const { customer } = await register().execute(
      shop.slug,
      "A",
      phone,
      undefined,
      ctx(k),
    );
    await new ApproveOnlineMemberUseCase(container.customerRepository).execute(
      shop.id,
      customer.id,
      ownerId,
    );
    const place = (qty: number, p = phone) =>
      new PlaceOrderUseCase(
        container.orderRepository,
        container.menuItemRepository,
        container.customerRepository,
        container.shopRepository,
      ).execute({
        shopId: shop.id,
        paymentMethod: "cash",
        channel: "online",
        fulfillmentType: "pickup",
        customerName: "A",
        customerPhone: p,
        cart: [{ menuItemId: item.id, quantity: qty }],
      });

    await assert.rejects(() => place(4), /ไม่เกิน 1000 บาท/); // 1200 THB
    const first = await place(2); // 600 THB
    await assert.rejects(() => place(1), /ครั้งละ 1 ออเดอร์/);

    // Non-member online customer (dynamic path) is unaffected.
    await place(5, "0869876541");
    await place(1, "0869876541");

    await container.orderRepository.markPaid(shop.id, first.id);
    await place(5); // full rights after first paid order
    await place(1);
  });
});
