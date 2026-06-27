/**
 * Tests for passwordless LINE-OTP login.
 * Run: npx tsx --test src/application/use-cases/auth/login-otp.test.ts
 *
 * Fakes are deterministic: the "hasher" stores `"h:<plain>"`, so a test can read
 * the generated OTP back out of the stored hash to drive verification.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { RequestLoginOtpUseCase } from "./RequestLoginOtpUseCase";
import { VerifyLoginOtpUseCase } from "./VerifyLoginOtpUseCase";
import { MAX_OTP_ATTEMPTS, OTP_TTL_MS } from "./login-otp";
import type { Role } from "@/src/domain/types/roles";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";
import type { IMessagePusher } from "@/src/application/services/IMessagePusher";

const hasher: IPasswordHasher = {
  async hash(plain) {
    return "h:" + plain;
  },
  async compare(plain, hash) {
    return hash === "h:" + plain;
  },
};

type Seed = {
  id: string;
  email: string;
  isActive: boolean;
  lineUserId: string | null;
  role?: Role;
};

function makeRepo(seed: Seed) {
  const otp = { hash: null as string | null, expiresAt: null as string | null, attempts: 0 };
  const repo = {
    async findByEmailWithSecret(email: string) {
      if (email.trim().toLowerCase() !== seed.email) return null;
      return {
        id: seed.id,
        email: seed.email,
        role: seed.role ?? "shop_owner",
        shopId: "s1",
        branchId: null,
        isActive: seed.isActive,
        lineUserId: seed.lineUserId,
        createdAt: "",
        updatedAt: "",
        passwordHash: "h:secret",
      };
    },
    async getLoginOtp(id: string) {
      return id === seed.id ? { ...otp } : null;
    },
    async setLoginOtp(id: string, hash: string, expiresAt: string) {
      void id;
      otp.hash = hash;
      otp.expiresAt = expiresAt;
      otp.attempts = 0;
    },
    async bumpLoginOtpAttempts() {
      otp.attempts += 1;
      return otp.attempts;
    },
    async clearLoginOtp() {
      otp.hash = null;
      otp.expiresAt = null;
      otp.attempts = 0;
    },
  };
  return { repo: repo as unknown as IUserRepository, otp };
}

function makePusher() {
  const pushes: { to: string; text: string }[] = [];
  const pusher: IMessagePusher = {
    async pushText(to, text) {
      pushes.push({ to, text });
    },
  };
  return { pusher, pushes };
}

const linked: Seed = { id: "u1", email: "owner@x.test", isActive: true, lineUserId: "U_line" };

test("request: linked active user -> otp_sent (owner = passwordAllowed false), pushed to LINE", async () => {
  const { repo, otp } = makeRepo(linked);
  const { pusher, pushes } = makePusher();
  const res = await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, true);
  assert.equal(res.status, "otp_sent");
  if (res.status === "otp_sent") assert.equal(res.passwordAllowed, false);
  assert.ok(otp.hash?.startsWith("h:"));
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0].to, "U_line");
  const code = otp.hash!.slice(2);
  assert.match(pushes[0].text, new RegExp(code));
});

test("request: linked admin -> otp_sent with passwordAllowed true (break-glass)", async () => {
  const { repo } = makeRepo({ ...linked, role: "platform_admin" });
  const { pusher } = makePusher();
  const res = await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, true);
  assert.equal(res.status, "otp_sent");
  if (res.status === "otp_sent") assert.equal(res.passwordAllowed, true);
});

test("request: linked owner but LINE not configured -> otp_unavailable", async () => {
  const { repo, otp } = makeRepo(linked);
  const { pusher, pushes } = makePusher();
  const res = await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, false);
  assert.equal(res.status, "otp_unavailable");
  assert.equal(otp.hash, null);
  assert.equal(pushes.length, 0);
});

test("request: linked admin + LINE not configured -> use_password (admin fallback)", async () => {
  const { repo } = makeRepo({ ...linked, role: "platform_admin" });
  const { pusher } = makePusher();
  const res = await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, false);
  assert.equal(res.status, "use_password");
});

test("request: no linked LINE -> use_password, nothing stored/pushed", async () => {
  const { repo, otp } = makeRepo({ ...linked, lineUserId: null });
  const { pusher, pushes } = makePusher();
  const res = await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, true);
  assert.equal(res.status, "use_password");
  assert.equal(otp.hash, null);
  assert.equal(pushes.length, 0);
});

test("request: inactive user -> use_password", async () => {
  const { repo } = makeRepo({ ...linked, isActive: false });
  const { pusher } = makePusher();
  const res = await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, true);
  assert.equal(res.status, "use_password");
});

test("request: unknown email -> use_password", async () => {
  const { repo } = makeRepo(linked);
  const { pusher } = makePusher();
  const res = await new RequestLoginOtpUseCase(repo, hasher, pusher).execute("nope@x.test", true);
  assert.equal(res.status, "use_password");
});

test("request: second request within cooldown -> cooldown with retryInSec", async () => {
  const { repo } = makeRepo(linked);
  const { pusher } = makePusher();
  const uc = new RequestLoginOtpUseCase(repo, hasher, pusher);
  const t0 = 1_000_000_000_000;
  assert.equal((await uc.execute(linked.email, true, t0)).status, "otp_sent");
  const again = await uc.execute(linked.email, true, t0 + 5_000);
  assert.equal(again.status, "cooldown");
  if (again.status === "cooldown") assert.ok(again.retryInSec > 0 && again.retryInSec <= 60);
});

test("request: after cooldown elapses -> otp_sent again", async () => {
  const { repo } = makeRepo(linked);
  const { pusher } = makePusher();
  const uc = new RequestLoginOtpUseCase(repo, hasher, pusher);
  const t0 = 1_000_000_000_000;
  await uc.execute(linked.email, true, t0);
  const later = await uc.execute(linked.email, true, t0 + 61_000);
  assert.equal(later.status, "otp_sent");
});

test("verify: correct code -> returns user (no passwordHash), OTP cleared", async () => {
  const { repo, otp } = makeRepo(linked);
  const { pusher } = makePusher();
  await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, true);
  const code = otp.hash!.slice(2);
  const user = await new VerifyLoginOtpUseCase(repo, hasher).execute(linked.email, code);
  assert.ok(user);
  assert.equal(user!.id, "u1");
  assert.ok(!("passwordHash" in (user as object)));
  assert.equal(otp.hash, null);
});

test("verify: wrong code -> null and bumps attempts", async () => {
  const { repo, otp } = makeRepo(linked);
  const { pusher } = makePusher();
  await new RequestLoginOtpUseCase(repo, hasher, pusher).execute(linked.email, true);
  const user = await new VerifyLoginOtpUseCase(repo, hasher).execute(linked.email, "000000");
  assert.equal(user, null);
  assert.equal(otp.attempts, 1);
});

test("verify: expired OTP -> null", async () => {
  const { repo } = makeRepo(linked);
  const past = new Date(Date.now() - OTP_TTL_MS - 1000).toISOString();
  await repo.setLoginOtp("u1", "h:123456", past);
  const user = await new VerifyLoginOtpUseCase(repo, hasher).execute(linked.email, "123456");
  assert.equal(user, null);
});

test("verify: too many attempts -> throws (locked)", async () => {
  const { repo, otp } = makeRepo(linked);
  const future = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await repo.setLoginOtp("u1", "h:123456", future);
  otp.attempts = MAX_OTP_ATTEMPTS;
  await assert.rejects(
    () => new VerifyLoginOtpUseCase(repo, hasher).execute(linked.email, "123456"),
    /เกินกำหนด/,
  );
});
