import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { ChangePasswordUseCase } from "./ChangePasswordUseCase";
import { ResetPasswordUseCase } from "./ResetPasswordUseCase";

before(async () => {
  await migrateTestDb();
});

const future = () => new Date(Date.now() + 3_600_000).toISOString();
// Offline breach checker — never hit HIBP from tests.
const noBreach = { isBreached: async () => false };

test("changing password revokes all existing sessions", async () => {
  const { ownerId } = await seedShop("sess-change");
  const s = await container.sessionRepository.create({
    userId: ownerId,
    expiresAt: future(),
  });
  await new ChangePasswordUseCase(
    container.userRepository,
    container.passwordHasher,
    container.sessionRepository,
    noBreach,
  ).execute(ownerId, "password123", "newpass456");

  const valid = await container.sessionRepository.findValid(s.id, new Date());
  assert.equal(valid, null, "old session is dead after password change");
});

test("admin reset revokes the target's sessions", async () => {
  const { ownerId } = await seedShop("sess-reset");
  const s = await container.sessionRepository.create({
    userId: ownerId,
    expiresAt: future(),
  });
  await new ResetPasswordUseCase(
    container.userRepository,
    container.passwordHasher,
    container.sessionRepository,
    noBreach,
  ).execute(ownerId, "resetpass789");

  assert.equal(
    await container.sessionRepository.findValid(s.id, new Date()),
    null,
    "target session revoked after admin reset",
  );
});

test("listByUser returns active sessions (with device info); deleteById is owner-scoped", async () => {
  const { ownerId } = await seedShop("sess-list");
  const s1 = await container.sessionRepository.create({
    userId: ownerId,
    expiresAt: future(),
    userAgent: "UA-1",
    ip: "1.1.1.1",
  });
  await container.sessionRepository.create({ userId: ownerId, expiresAt: future() });

  const list = await container.sessionRepository.listByUser(ownerId, new Date());
  assert.equal(list.length, 2, "two active sessions");
  assert.equal(list.find((x) => x.id === s1.id)?.userAgent, "UA-1", "device info stored");

  // A different user can't delete someone else's session.
  await container.sessionRepository.deleteById(s1.id, "not-the-owner");
  assert.equal((await container.sessionRepository.listByUser(ownerId, new Date())).length, 2);
  // The owner can.
  await container.sessionRepository.deleteById(s1.id, ownerId);
  assert.equal((await container.sessionRepository.listByUser(ownerId, new Date())).length, 1);
});
