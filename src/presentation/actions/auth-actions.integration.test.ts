import { afterEach, before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { totpAt } from "@/src/infrastructure/services/CryptoTotpService";

// --- Mock the Next request-context modules the auth actions import. ----------
let sessionToken: string | null = null;
let pendingCookie: string | null = null;
const cookieStore = {
  get: (name: string) => {
    if (name === "es_session" && sessionToken) return { value: sessionToken };
    if (name === "es_pending_2fa" && pendingCookie) return { value: pendingCookie };
    return undefined;
  },
  set: () => {},
  delete: () => {},
};
const headerStore = new Map<string, string>([["x-forwarded-for", "203.0.113.1"]]);

mock.module("next/headers", {
  namedExports: {
    cookies: async () => cookieStore,
    headers: async () => headerStore,
  },
});
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  namedExports: {
    redirect: () => {
      throw new Error("REDIRECT");
    },
  },
});

type A = typeof import("./auth-actions");
let actions: A;

const realFetch = global.fetch;

function setIp(ip: string): void {
  headerStore.set("x-forwarded-for", ip);
}

async function loginAs(userId: string): Promise<void> {
  const s = await container.sessionRepository.create({
    userId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    userAgent: "test",
    ip: "203.0.113.1",
  });
  sessionToken = s.id;
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function makeUser(
  email: string,
  opts: { role?: "shop_owner" | "platform_admin"; password?: string } = {},
) {
  return container.userRepository.create({
    email,
    passwordHash: opts.password
      ? await container.passwordHasher.hash(opts.password)
      : "x",
    role: opts.role ?? "shop_owner",
  });
}

/** Turn on 2FA for a user and return the secret (so tests can mint codes). */
async function enable2fa(userId: string): Promise<string> {
  const secret = container.totp.generateSecret();
  await container.userRepository.setTotpSecret(userId, secret);
  await container.userRepository.enableTotp(userId, [
    await container.passwordHasher.hash("RECOVERY1"),
  ]);
  return secret;
}

const auditByActor = (actorUserId: string) =>
  container.auditLogRepository.page({ actorUserId });
const auditByAction = (action: string) =>
  container.auditLogRepository.page({ action });

before(async () => {
  await migrateTestDb();
  actions = await import("./auth-actions");
});
beforeEach(() => {
  sessionToken = null;
  pendingCookie = null;
  setIp("203.0.113.1");
  // Neutralize any outbound fetch (HIBP breach check, LINE alerts) — fail-soft.
  global.fetch = (async () => new Response("", { status: 200 })) as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

// --- loginAction ------------------------------------------------------------
test("loginAction: wrong password returns an error, no session", async () => {
  setIp("10.1.0.1");
  await makeUser("login-bad@test.local", { password: "correct-pw-123" });
  const res = await actions.loginAction({}, form({
    email: "login-bad@test.local",
    password: "wrong",
  }));
  assert.match(res.error ?? "", /อีเมลหรือรหัสผ่าน/);
});

test("loginAction: valid password logs in (redirect) + audits success", async () => {
  setIp("10.1.0.2");
  const u = await makeUser("login-ok@test.local", { password: "correct-pw-123" });
  await assert.rejects(
    actions.loginAction({}, form({ email: "login-ok@test.local", password: "correct-pw-123" })),
    /REDIRECT/,
  );
  const logs = await auditByActor(u.id);
  assert.ok(logs.items.some((l) => l.action === "login_succeeded"));
});

test("loginAction: a 2FA account stops at the code step (no session yet)", async () => {
  setIp("10.1.0.3");
  const u = await makeUser("login-2fa@test.local", { password: "correct-pw-123" });
  await enable2fa(u.id);
  const res = await actions.loginAction({}, form({
    email: "login-2fa@test.local",
    password: "correct-pw-123",
  }));
  assert.equal(res.twoFactorRequired, true);
  assert.equal(res.error, undefined);
});

// --- verifyLoginOtpAction ---------------------------------------------------
test("verifyLoginOtpAction: a valid seeded OTP logs in + audits", async () => {
  setIp("10.2.0.1");
  const u = await makeUser("otp-ok@test.local");
  await container.userRepository.setLoginOtp(
    u.id,
    await container.passwordHasher.hash("123456"),
    new Date(Date.now() + 5 * 60_000).toISOString(),
  );
  await assert.rejects(
    actions.verifyLoginOtpAction({}, form({ email: "otp-ok@test.local", otp: "123456" })),
    /REDIRECT/,
  );
  const logs = await auditByActor(u.id);
  assert.ok(logs.items.some((l) => l.action === "login_succeeded"));
});

test("verifyLoginOtpAction: a wrong OTP errors + audits otp_failed", async () => {
  setIp("10.2.0.2");
  const u = await makeUser("otp-bad@test.local");
  await container.userRepository.setLoginOtp(
    u.id,
    await container.passwordHasher.hash("123456"),
    new Date(Date.now() + 5 * 60_000).toISOString(),
  );
  const res = await actions.verifyLoginOtpAction({}, form({
    email: "otp-bad@test.local",
    otp: "000000",
  }));
  assert.match(res.error ?? "", /OTP/);
  assert.ok((await auditByAction("otp_failed")).items.length > 0);
});

// --- verifyLoginTwoFactorAction ---------------------------------------------
test("verifyLoginTwoFactorAction: no pending marker → error", async () => {
  const res = await actions.verifyLoginTwoFactorAction({}, form({ code: "123456" }));
  assert.match(res.error ?? "", /หมดเวลา/);
});

test("verifyLoginTwoFactorAction: a valid TOTP logs in", async () => {
  const u = await makeUser("2fa-ok@test.local");
  const secret = await enable2fa(u.id);
  pendingCookie = JSON.stringify({ userId: u.id, exp: Date.now() + 60_000 });
  const code = totpAt(secret, Math.floor(Date.now() / 1000));
  await assert.rejects(
    actions.verifyLoginTwoFactorAction({}, form({ code })),
    /REDIRECT/,
  );
});

test("verifyLoginTwoFactorAction: a wrong TOTP errors + audits", async () => {
  const u = await makeUser("2fa-bad@test.local");
  const secret = await enable2fa(u.id);
  pendingCookie = JSON.stringify({ userId: u.id, exp: Date.now() + 60_000 });
  const valid = totpAt(secret, Math.floor(Date.now() / 1000));
  const wrong = String((Number(valid[0]) + 5) % 10) + valid.slice(1);
  const res = await actions.verifyLoginTwoFactorAction({}, form({ code: wrong }));
  assert.match(res.error ?? "", /ไม่ถูกต้อง/);
  assert.ok((await auditByActor(u.id)).items.some((l) => l.action === "two_factor_failed"));
});

// --- requestLoginOtpAction --------------------------------------------------
test("requestLoginOtpAction: invalid email → error", async () => {
  const res = await actions.requestLoginOtpAction({}, form({ email: "nope" }));
  assert.match(res.error ?? "", /อีเมล/);
});

test("requestLoginOtpAction: a non-LINE user falls back to password", async () => {
  setIp("10.3.0.1");
  await makeUser("otp-fallback@test.local");
  const res = await actions.requestLoginOtpAction({}, form({ email: "otp-fallback@test.local" }));
  assert.equal(res.next, "password");
});

test("requestLoginOtpAction: IP rate-limit kicks in after the cap", async () => {
  setIp("10.3.0.99");
  let lastErr = "";
  for (let i = 0; i < 12; i++) {
    const res = await actions.requestLoginOtpAction({}, form({ email: `rl${i}@test.local` }));
    lastErr = res.error ?? "";
  }
  assert.match(lastErr, /หลายครั้ง/);
});

// --- 2FA setup (admin) ------------------------------------------------------
test("confirmTwoFactorSetupAction: admin confirms with a valid code", async () => {
  setIp("10.4.0.1");
  const admin = await makeUser("admin-2fa@test.local", { role: "platform_admin" });
  await loginAs(admin.id);
  const begin = await actions.beginTwoFactorSetupAction();
  const code = totpAt(begin.secret!, Math.floor(Date.now() / 1000));
  const res = await actions.confirmTwoFactorSetupAction({}, form({ code }));
  assert.ok(Array.isArray(res.recoveryCodes) && res.recoveryCodes.length > 0);
  assert.ok((await auditByActor(admin.id)).items.some((l) => l.action === "two_factor_enabled"));
});

test("confirmTwoFactorSetupAction: a wrong code errors", async () => {
  setIp("10.4.0.2");
  const admin = await makeUser("admin-2fa-bad@test.local", { role: "platform_admin" });
  await loginAs(admin.id);
  await actions.beginTwoFactorSetupAction();
  const res = await actions.confirmTwoFactorSetupAction({}, form({ code: "000000" }));
  assert.ok(res.error);
  assert.equal(res.recoveryCodes, undefined);
});

// --- session management -----------------------------------------------------
test("revokeSessionAction: unauthenticated → error", async () => {
  const res = await actions.revokeSessionAction("some-id");
  assert.match(res.error ?? "", /เข้าสู่ระบบ/);
});

test("changeMyPasswordAction: unauthenticated → error", async () => {
  const res = await actions.changeMyPasswordAction({}, form({
    currentPassword: "a",
    newPassword: "b-very-long-123",
    confirmPassword: "b-very-long-123",
  }));
  assert.match(res.error ?? "", /เข้าสู่ระบบ/);
});

test("changeMyPasswordAction: mismatched confirmation → error", async () => {
  const u = await makeUser("pw-mismatch@test.local", { password: "old-pw-1234" });
  await loginAs(u.id);
  const res = await actions.changeMyPasswordAction({}, form({
    currentPassword: "old-pw-1234",
    newPassword: "new-pw-12345",
    confirmPassword: "different-12345",
  }));
  assert.match(res.error ?? "", /ไม่ตรงกัน/);
});

test("changeMyPasswordAction: valid change succeeds + audits", async () => {
  const u = await makeUser("pw-ok@test.local", { password: "old-pw-1234" });
  await loginAs(u.id);
  const res = await actions.changeMyPasswordAction({}, form({
    currentPassword: "old-pw-1234",
    newPassword: "brand-new-pw-9876",
    confirmPassword: "brand-new-pw-9876",
  }));
  assert.ok(res.success, res.error);
  assert.ok((await auditByActor(u.id)).items.some((l) => l.action === "password_changed"));
});

// --- dev login guard --------------------------------------------------------
test("devLoginAsAction: an unknown user is rejected", async () => {
  await assert.rejects(actions.devLoginAsAction("no-such-user"), /ไม่พร้อมใช้งาน/);
});
