import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { totpAt } from "@/src/infrastructure/services/CryptoTotpService";
import { BeginTwoFactorSetupUseCase } from "./BeginTwoFactorSetupUseCase";
import { ConfirmTwoFactorSetupUseCase } from "./ConfirmTwoFactorSetupUseCase";
import { VerifyTwoFactorUseCase } from "./VerifyTwoFactorUseCase";
import { DisableTwoFactorUseCase } from "./DisableTwoFactorUseCase";
import { RegenerateRecoveryCodesUseCase } from "./RegenerateRecoveryCodesUseCase";
import { ResetPeerTwoFactorUseCase } from "./ResetPeerTwoFactorUseCase";

before(async () => {
  await migrateTestDb();
});

async function adminUser(email: string) {
  const passwordHash = await container.passwordHasher.hash("password123");
  return container.userRepository.create({
    email,
    passwordHash,
    role: "platform_admin",
    shopId: null,
    branchId: null,
  });
}

const now = () => Math.floor(Date.now() / 1000);

test("enroll → confirm → verify (TOTP + recovery), then disable", async () => {
  const admin = await adminUser("2fa@test.local");
  const begin = new BeginTwoFactorSetupUseCase(container.userRepository, container.totp);
  const { secret } = await begin.execute(admin.id, admin.email);

  // Not enabled until confirmed.
  assert.equal((await container.userRepository.findById(admin.id))?.totpEnabled, false);

  const confirm = new ConfirmTwoFactorSetupUseCase(
    container.userRepository,
    container.totp,
    container.passwordHasher,
  );
  // A wrong code is rejected.
  await assert.rejects(confirm.execute(admin.id, "000000"), /ไม่ถูกต้อง/);
  const recovery = await confirm.execute(admin.id, totpAt(secret, now()));
  assert.equal(recovery.length, 10, "10 recovery codes issued");
  assert.equal((await container.userRepository.findById(admin.id))?.totpEnabled, true);

  const verify = new VerifyTwoFactorUseCase(
    container.userRepository,
    container.totp,
    container.passwordHasher,
  );
  assert.equal(await verify.execute(admin.id, totpAt(secret, now())), true, "valid TOTP");
  assert.equal(await verify.execute(admin.id, "999999"), false, "wrong TOTP");

  // Recovery code works once, then is consumed.
  assert.equal(await verify.execute(admin.id, recovery[0]), true, "recovery code accepted");
  assert.equal(await verify.execute(admin.id, recovery[0]), false, "recovery code single-use");

  // Disable requires the password.
  const disable = new DisableTwoFactorUseCase(container.userRepository, container.passwordHasher);
  await assert.rejects(disable.execute(admin.id, "wrongpw"), /รหัสผ่าน/);
  await disable.execute(admin.id, "password123");
  assert.equal((await container.userRepository.findById(admin.id))?.totpEnabled, false);
  assert.equal(await verify.execute(admin.id, totpAt(secret, now())), false, "2FA off → verify false");
});

test("regenerate recovery codes invalidates the old set (and needs the password)", async () => {
  const admin = await adminUser("2fa-regen@test.local");
  const { secret } = await new BeginTwoFactorSetupUseCase(
    container.userRepository,
    container.totp,
  ).execute(admin.id, admin.email);
  const oldCodes = await new ConfirmTwoFactorSetupUseCase(
    container.userRepository,
    container.totp,
    container.passwordHasher,
  ).execute(admin.id, totpAt(secret, now()));

  const regen = new RegenerateRecoveryCodesUseCase(
    container.userRepository,
    container.passwordHasher,
  );
  await assert.rejects(regen.execute(admin.id, "wrongpw"), /รหัสผ่าน/);
  const newCodes = await regen.execute(admin.id, "password123");
  assert.equal(newCodes.length, 10);
  assert.notDeepEqual(newCodes, oldCodes, "a fresh set is issued");

  const verify = new VerifyTwoFactorUseCase(
    container.userRepository,
    container.totp,
    container.passwordHasher,
  );
  assert.equal(await verify.execute(admin.id, oldCodes[0]), false, "old code no longer works");
  assert.equal(await verify.execute(admin.id, newCodes[0]), true, "new code works");
});

test("break-glass: a peer admin resets another admin's 2FA + kills sessions", async () => {
  const target = await adminUser("2fa-peer@test.local");
  const { secret } = await new BeginTwoFactorSetupUseCase(
    container.userRepository,
    container.totp,
  ).execute(target.id, target.email);
  await new ConfirmTwoFactorSetupUseCase(
    container.userRepository,
    container.totp,
    container.passwordHasher,
  ).execute(target.id, totpAt(secret, now()));
  const session = await container.sessionRepository.create({
    userId: target.id,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  });

  await new ResetPeerTwoFactorUseCase(
    container.userRepository,
    container.sessionRepository,
  ).execute(target.id);

  assert.equal((await container.userRepository.findById(target.id))?.totpEnabled, false, "2FA cleared");
  assert.equal(
    await container.sessionRepository.findValid(session.id, new Date()),
    null,
    "sessions killed (forces re-login + re-enroll)",
  );
});
