import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { SubmitOwnerContactRequestUseCase } from "./SubmitOwnerContactRequestUseCase";
import { SubmitPublicContactRequestUseCase } from "./SubmitPublicContactRequestUseCase";
import { ResolveContactRequestUseCase } from "./ResolveContactRequestUseCase";
import type { ICaptchaVerifier } from "@/src/application/services/ICaptchaVerifier";

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

function ownerContact() {
  return new SubmitOwnerContactRequestUseCase(
    container.contactRequestRepository,
    container.shopRepository,
    container.notificationService,
  );
}

function publicContact(captcha: ICaptchaVerifier = container.turnstile) {
  return new SubmitPublicContactRequestUseCase(
    captcha,
    container.rateLimitRepository,
    container.contactRequestRepository,
    container.notificationService,
  );
}

function resolveContact() {
  return new ResolveContactRequestUseCase(
    container.contactRequestRepository,
    container.notificationService,
  );
}

test("owner request notifies admins; a duplicate while open is blocked", async () => {
  const admin = await adminUser("admin-contact-1@test.local");
  const { shop, ownerId } = await seedShop("contact-own");

  await ownerContact().execute({
    shopId: shop.id,
    userId: ownerId,
    subject: "ขอความช่วยเหลือ",
    message: "ระบบมีปัญหา",
    contactChannel: "โทร 0810000000",
  });

  const adminNotis = await container.notificationRepository.listByUser(admin.id);
  assert.ok(
    adminNotis.some((n) => n.type === "contact_request"),
    "admin notified of the new contact request",
  );

  await assert.rejects(
    ownerContact().execute({
      shopId: shop.id,
      userId: ownerId,
      subject: "อีกครั้ง",
      message: "ยังไม่ได้รับการตอบกลับ",
      contactChannel: "โทร",
    }),
    /รอผู้ดูแล/,
  );
});

test("after resolve, a quick follow-up is blocked by cooldown; creator is notified", async () => {
  const admin = await adminUser("admin-contact-2@test.local");
  const { shop, ownerId } = await seedShop("contact-cd");

  const req = await ownerContact().execute({
    shopId: shop.id,
    userId: ownerId,
    subject: "เรื่องแรก",
    message: "...",
    contactChannel: "line",
  });

  await resolveContact().execute(req.id, admin.id);

  const ownerNotis = await container.notificationRepository.listByUser(ownerId);
  assert.ok(
    ownerNotis.some((n) => n.type === "contact_resolved"),
    "creator notified that the request was resolved",
  );

  await assert.rejects(
    ownerContact().execute({
      shopId: shop.id,
      userId: ownerId,
      subject: "เรื่องที่สอง",
      message: "ส่งเร็วเกินไป",
      contactChannel: "line",
    }),
    /รออีกประมาณ/,
  );
});

test("public request: rate-limited after 3 in the window", async () => {
  const ip = "203.0.113.10";
  const input = {
    email: "user@test.local",
    subject: "ติดต่อ",
    message: "เข้าระบบไม่ได้",
    contactChannel: "email",
    ip,
    captchaToken: "x",
  };
  // First 3 within the 24h window are allowed.
  for (let i = 0; i < 3; i++) await publicContact().execute(input);
  await assert.rejects(publicContact().execute(input), /บ่อยเกินไป/);
});

test("public request: a failing CAPTCHA is rejected", async () => {
  const failing = { verify: async () => false };
  await assert.rejects(
    publicContact(failing).execute({
      email: "bot@test.local",
      subject: "spam",
      message: "spam",
      contactChannel: "none",
      ip: "203.0.113.20",
      captchaToken: "bad",
    }),
    /ไม่ใช่บอท/,
  );
});
