import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import {
  MEMBER_POLICY_DEFAULTS,
  effectiveMemberPolicy,
  isInBounds,
  validateMemberPolicy,
} from "@/src/domain/services/member-policy";
import { UpdateMemberSettingsUseCase } from "./UpdateMemberSettingsUseCase";
import { RegisterStaticMemberUseCase } from "./RegisterStaticMemberUseCase";

describe("member policy settings", () => {
  before(async () => {
    await migrateTestDb();
  });

  it("defaults + bounds", () => {
    assert.deepEqual(effectiveMemberPolicy({}), MEMBER_POLICY_DEFAULTS);
    assert.equal(MEMBER_POLICY_DEFAULTS.newMemberOrderCapThb, 1000);
    assert.ok(isInBounds("newMemberOrderCapThb", 0));
    assert.ok(!isInBounds("newMemberOrderCapThb", 50));
    assert.ok(!isInBounds("newMemberMaxOpenOrders", 6));
    assert.ok(!isInBounds("pendingExpiryHours", 11));
    assert.ok(isInBounds("rejectCooldownDays", 0));
    assert.throws(() =>
      validateMemberPolicy({ ...MEMBER_POLICY_DEFAULTS, maxPendingRequests: 201 }),
    );
  });

  it("saves overrides, reports before/after, rejects out-of-range", async () => {
    const { shop } = await seedShop("member-settings-a");
    const uc = new UpdateMemberSettingsUseCase(container.shopRepository);
    await assert.rejects(() =>
      uc.execute(shop.id, {
        policy: { ...MEMBER_POLICY_DEFAULTS, signupsPerDevicePerDay: 0 },
        memberOtpEnabled: false,
        memberSignupPaused: false,
      }),
    );
    const res = await uc.execute(shop.id, {
      policy: { ...MEMBER_POLICY_DEFAULTS, signupsPerDevicePerDay: 1, newMemberOrderCapThb: 0 },
      memberOtpEnabled: true,
      memberSignupPaused: false,
    });
    assert.equal(res.before.policy.signupsPerDevicePerDay, 3);
    const saved = (await container.shopRepository.findById(shop.id))!;
    const p = effectiveMemberPolicy(saved.memberPolicyOverrides);
    assert.equal(p.signupsPerDevicePerDay, 1);
    assert.equal(p.newMemberOrderCapThb, 0);
    assert.equal(saved.memberOtpEnabled, true);
  });

  it("per-shop signups/day limit is enforced", async () => {
    const { shop } = await seedShop("member-settings-b");
    await container.shopRepository.updateSettings(shop.id, {
      onlineOrderingEnabled: true,
    });
    await new UpdateMemberSettingsUseCase(container.shopRepository).execute(shop.id, {
      policy: { ...MEMBER_POLICY_DEFAULTS, signupsPerDevicePerDay: 1 },
      memberOtpEnabled: false,
      memberSignupPaused: false,
    });
    const k = (await container.shopRepository.getStaticJoinToken(shop.id))!;
    const reg = new RegisterStaticMemberUseCase(
      container.shopRepository,
      container.customerRepository,
      container.customerDeviceRepository,
      container.memberSignupGuardRepository,
    );
    const c = { joinKey: k, ipHash: "ip-same", deviceId: "dev-same" };
    await reg.execute(shop.slug, "A", "0861234957", undefined, c);
    await assert.rejects(() =>
      reg.execute(shop.slug, "B", "0869135724", undefined, c),
    );
  });
});
