import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { VerifyPaymentUseCase } from "./VerifyPaymentUseCase";

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
