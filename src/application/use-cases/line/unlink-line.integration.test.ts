import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { UnlinkLineAccountUseCase } from "./UnlinkLineAccountUseCase";

before(async () => {
  await migrateTestDb();
});

test("unlink clears both the linked LINE id and any pending link code", async () => {
  const passwordHash = await container.passwordHasher.hash("password123");
  const user = await container.userRepository.create({
    email: "line-unlink@test.local",
    passwordHash,
    role: "shop_owner",
    shopId: null,
    branchId: null,
  });

  // Simulate a linked + code-pending account.
  await container.userRepository.setLineUserId(user.id, "U123abc");
  await container.userRepository.setLineLinkCode(
    user.id,
    "ABC234",
    new Date(Date.now() + 600_000).toISOString(),
  );

  await new UnlinkLineAccountUseCase(container.userRepository).execute(user.id);

  const after = await container.userRepository.findById(user.id);
  assert.equal(after?.lineUserId, null, "lineUserId cleared");
  const byCode = await container.userRepository.findByLineLinkCode("ABC234");
  assert.equal(byCode, null, "link code cleared");
});
