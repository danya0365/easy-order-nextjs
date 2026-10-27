import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { VerifyPaymentUseCase } from "./VerifyPaymentUseCase";
import { GetBillingStateUseCase } from "./GetBillingStateUseCase";

/**
 * Money path: a pending top-up payment, when approved, must credit exactly the
 * purchased days to the shop's subscription and write one ledger entry — and a
 * reject must not. Uses the real ManualSlipPaymentVerifier from the container.
 */

const DAY = 24 * 60 * 60 * 1000;

before(migrateTestDb);

function verify() {
  return new VerifyPaymentUseCase(
    container.paymentRepository,
    container.subscriptionRepository,
    container.paymentVerifier,
    container.topupTransactionRepository,
  );
}

async function pendingPayment(
  shopId: string,
  subscriptionId: string,
  submittedBy: string,
  due: string,
  daysToAdd: number,
) {
  return container.paymentRepository.create({
    shopId,
    subscriptionId,
    amountSatang: daysToAdd * 1000,
    daysToAdd,
    bonusDays: 0,
    packageId: null,
    slipUrl: "slips/test.png",
    submittedBy,
    coversPeriodStartAt: due,
    coversPeriodDueAt: due,
  });
}

test("approving a slip credits the purchased days + writes one ledger entry", async () => {
  const { shop, ownerId } = await seedShop("bill-approve");
  const sub0 = (await container.subscriptionRepository.findByShop(shop.id))!;
  const dueBefore = new Date(sub0.currentPeriodDueAt).getTime();

  const payment = await pendingPayment(shop.id, sub0.id, ownerId, sub0.currentPeriodDueAt, 30);
  assert.equal(payment.status, "pending");

  const resolved = await verify().execute({
    paymentId: payment.id,
    reviewerUserId: ownerId,
    decision: "approve",
  });
  assert.equal(resolved.status, "approved");

  const sub1 = (await container.subscriptionRepository.findByShop(shop.id))!;
  assert.equal(sub1.status, "active");
  // Trial due is in the future → 30 days stack onto it exactly.
  const dueAfter = new Date(sub1.currentPeriodDueAt).getTime();
  assert.equal(Math.round((dueAfter - dueBefore) / DAY), 30);

  const ledger = await container.topupTransactionRepository.pageByShop(shop.id);
  assert.equal(ledger.items.length, 1);
  assert.equal(ledger.items[0].daysAdded, 30);
});

test("a resolved payment can't be verified again", async () => {
  const { shop, ownerId } = await seedShop("bill-double");
  const sub = (await container.subscriptionRepository.findByShop(shop.id))!;
  const payment = await pendingPayment(shop.id, sub.id, ownerId, sub.currentPeriodDueAt, 30);

  await verify().execute({ paymentId: payment.id, reviewerUserId: ownerId, decision: "approve" });
  await assert.rejects(
    verify().execute({ paymentId: payment.id, reviewerUserId: ownerId, decision: "approve" }),
    /ตรวจสอบไปแล้ว/,
  );
});

test("rejecting a slip does not extend the subscription", async () => {
  const { shop, ownerId } = await seedShop("bill-reject");
  const sub0 = (await container.subscriptionRepository.findByShop(shop.id))!;
  const payment = await pendingPayment(shop.id, sub0.id, ownerId, sub0.currentPeriodDueAt, 30);

  const resolved = await verify().execute({
    paymentId: payment.id,
    reviewerUserId: ownerId,
    decision: "reject",
    rejectReason: "สลิปไม่ชัด",
  });
  assert.equal(resolved.status, "rejected");

  const sub1 = (await container.subscriptionRepository.findByShop(shop.id))!;
  assert.equal(sub1.currentPeriodDueAt, sub0.currentPeriodDueAt); // unchanged
  const ledger = await container.topupTransactionRepository.pageByShop(shop.id);
  assert.equal(ledger.items.length, 0);
});

// --- Platform soft-launch switches (platform_settings) ---

function billing() {
  return new GetBillingStateUseCase(
    container.shopRepository,
    container.subscriptionRepository,
    container.platformSettingsRepository,
    container.orderRepository,
  );
}

/** Make the shop's subscription overdue past the grace window. */
async function makeOverdue(shopId: string) {
  const sub = (await container.subscriptionRepository.findByShop(shopId))!;
  await container.subscriptionRepository.advancePeriod(sub.id, {
    currentPeriodStartAt: sub.currentPeriodStartAt,
    currentPeriodDueAt: new Date(Date.now() - 20 * DAY).toISOString(),
    status: "active",
  });
}

test("platform settings row resolves to defaults (get creates it if missing)", async () => {
  const settings = await container.platformSettingsRepository.get();
  assert.equal(settings.id, "default");
  assert.equal(settings.billingUiEnabled, true);
  assert.equal(settings.orderThresholdBillingEnabled, false);
  assert.equal(settings.orderThresholdCount, 50);
  assert.equal(settings.shopSuspensionEnabled, false);
});

test("orderThresholdBillingEnabled keeps shops under the threshold free", async () => {
  const { shop } = await seedShop("bill-threshold");
  await makeOverdue(shop.id);

  // Threshold off → an overdue shop truly blocks access (suspension ON).
  await container.platformSettingsRepository.update({ shopSuspensionEnabled: true });
  const before = await billing().execute(shop.id);
  assert.equal(before.status.isSuspended, true);

  await container.platformSettingsRepository.update({
    orderThresholdBillingEnabled: true,
  });
  try {
    const state = await billing().execute(shop.id);
    assert.equal(state.status.isSuspended, false, "under threshold = no billing block");
    assert.equal(state.status.state, "active");
    assert.equal(state.status.bannerLevel, 0);

    // Past the threshold → the overdue state comes back.
    await container.platformSettingsRepository.update({ orderThresholdCount: 0 });
    const after = await billing().execute(shop.id);
    assert.equal(after.status.isSuspended, true);
  } finally {
    await container.platformSettingsRepository.update({
      orderThresholdBillingEnabled: false,
      orderThresholdCount: 50,
      shopSuspensionEnabled: false,
    });
  }
});

test("billingUiEnabled off suppresses dunning banners and overdue suspension", async () => {
  const { shop } = await seedShop("bill-ui-off");
  await makeOverdue(shop.id);
  await container.platformSettingsRepository.update({ billingUiEnabled: false });
  try {
    const state = await billing().execute(shop.id);
    assert.equal(state.billingUiEnabled, false);
    assert.equal(state.status.isSuspended, false);
    assert.equal(state.status.bannerLevel, 0);
    assert.equal(state.status.preExpiryBannerLevel, 0);
  } finally {
    await container.platformSettingsRepository.update({ billingUiEnabled: true });
  }
});

test("shopSuspensionEnabled=false keeps overdue shops working (warn-only)", async () => {
  const { shop } = await seedShop("bill-warn-only");
  await makeOverdue(shop.id);

  // When the flag is ON (default in the pure function), billing wins.
  await container.platformSettingsRepository.update({ shopSuspensionEnabled: true });
  try {
    const enforced = await billing().execute(shop.id);
    assert.equal(enforced.status.isSuspended, true);
    assert.equal(enforced.status.suspendReason, "overdue");

    // OFF (default): reads are allowed — only state/banner nags.
    await container.platformSettingsRepository.update({ shopSuspensionEnabled: false });
    const warnOnly = await billing().execute(shop.id);
    assert.equal(warnOnly.shopSuspensionEnabled, false);
    assert.equal(
      warnOnly.status.isSuspended,
      false,
      "overdue shop keeps access while suspension enforcement is off",
    );
    assert.equal(warnOnly.status.bannerLevel > 0, true, "the nag banner stays");

    // Admin suspension still blocks in warn-only mode.
    await container.shopRepository.setStatus(shop.id, "suspended_by_admin");
    const admin = await billing().execute(shop.id);
    assert.equal(admin.status.isSuspended, true);
    assert.equal(admin.status.suspendReason, "admin");
  } finally {
    await container.platformSettingsRepository.update({ shopSuspensionEnabled: false });
    await container.shopRepository.setStatus(shop.id, "active");
  }
});
