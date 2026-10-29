import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { RegisterStaticMemberUseCase } from "./RegisterStaticMemberUseCase";
import { ResolveStaticJoinGateUseCase } from "./ResolveStaticJoinGateUseCase";
import { ApproveOnlineMemberUseCase } from "./ApproveOnlineMemberUseCase";
import { RejectOnlineMemberUseCase } from "./RejectOnlineMemberUseCase";

describe("static QR membership", () => {
  before(async () => {
    await migrateTestDb();
  });

  it("register → pending → approve unlocks approved gate", async () => {
    const { shop, ownerId } = await seedShop("static-join-ok");
    await container.shopRepository.updateSettings(shop.id, {
      onlineOrderingEnabled: true,
    });

    const register = new RegisterStaticMemberUseCase(
      container.shopRepository,
      container.customerRepository,
      container.customerDeviceRepository,
    );
    const resolve = new ResolveStaticJoinGateUseCase(
      container.shopRepository,
      container.customerDeviceRepository,
    );

    const noToken = await resolve.execute(shop.slug, null);
    assert.equal(noToken.kind, "needs_register");

    const { token, customer } = await register.execute(
      shop.slug,
      "แดน",
      "0812345678",
    );
    assert.equal(customer.onlineOrderStatus, "pending");
    assert.ok(customer.onlineOrderRequestedAt);

    const pendingGate = await resolve.execute(shop.slug, token);
    assert.equal(pendingGate.kind, "pending");

    const pendingList =
      await container.customerRepository.listPendingOnlineOrder(shop.id);
    assert.equal(pendingList.length, 1);
    assert.equal(pendingList[0].id, customer.id);

    await new ApproveOnlineMemberUseCase(container.customerRepository).execute(
      shop.id,
      customer.id,
      ownerId,
    );

    const approvedGate = await resolve.execute(shop.slug, token);
    assert.equal(approvedGate.kind, "approved");
    assert.equal(approvedGate.customer?.onlineOrderStatus, "approved");
  });

  it("reject leaves rejected gate", async () => {
    const { shop, ownerId } = await seedShop("static-join-rej");
    await container.shopRepository.updateSettings(shop.id, {
      onlineOrderingEnabled: true,
    });

    const register = new RegisterStaticMemberUseCase(
      container.shopRepository,
      container.customerRepository,
      container.customerDeviceRepository,
    );
    const resolve = new ResolveStaticJoinGateUseCase(
      container.shopRepository,
      container.customerDeviceRepository,
    );

    const { token, customer } = await register.execute(
      shop.slug,
      "Test",
      "0899999999",
    );
    await new RejectOnlineMemberUseCase(container.customerRepository).execute(
      shop.id,
      customer.id,
      ownerId,
    );
    const gate = await resolve.execute(shop.slug, token);
    assert.equal(gate.kind, "rejected");
  });

  it("OTP-enabled shop requires non-empty otp (stub)", async () => {
    const { shop } = await seedShop("static-join-otp");
    await container.shopRepository.updateSettings(shop.id, {
      onlineOrderingEnabled: true,
      memberOtpEnabled: true,
    });
    const register = new RegisterStaticMemberUseCase(
      container.shopRepository,
      container.customerRepository,
      container.customerDeviceRepository,
    );
    await assert.rejects(
      () => register.execute(shop.slug, "A", "0811111111"),
      /OTP/,
    );
    const ok = await register.execute(shop.slug, "A", "0811111111", "123456");
    assert.equal(ok.customer.onlineOrderStatus, "pending");
  });

  it("ordering_off when online ordering disabled", async () => {
    const { shop } = await seedShop("static-join-off");
    const resolve = new ResolveStaticJoinGateUseCase(
      container.shopRepository,
      container.customerDeviceRepository,
    );
    const gate = await resolve.execute(shop.slug, null);
    assert.equal(gate.kind, "ordering_off");
  });
});
