import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import {
  ConsumeOneTimeLoginLinkUseCase,
  CreateOneTimeLoginLinkUseCase,
  ResolveOneTimeLoginLinkUseCase,
  CreateAdminSelfLoginLinkUseCase,
  IssueAdminLoginLinkUseCase,
} from "./OneTimeLoginUseCases";
import {
  hashOneTimeLoginToken,
  isWellFormedToken,
  maskEmail,
} from "@/src/domain/services/one-time-login";

const deps = () =>
  [
    container.adminLoginLinkRepository,
    container.shopRepository,
    container.userRepository,
  ] as const;
const create = () => new CreateOneTimeLoginLinkUseCase(...deps());
const resolve = () => new ResolveOneTimeLoginLinkUseCase(...deps());
const consume = () => new ConsumeOneTimeLoginLinkUseCase(...deps());

let adminId: string;

describe("admin one-time login links", () => {
  before(async () => {
    await migrateTestDb();
    const admin = await container.userRepository.create({
      email: "otl-admin@test.local",
      passwordHash: "x",
      role: "platform_admin",
      shopId: null,
      branchId: null,
    });
    adminId = admin.id;
  });

  it("token helpers", () => {
    assert.equal(maskEmail("somchai@gmail.com"), "so*****@gmail.com");
    assert.ok(!isWellFormedToken("short"));
  });

  it("create stores only hash; list accounts; use once; second use fails", async () => {
    const { shop, ownerId } = await seedShop("otl-a");
    const { token, link } = await create().execute({ shopId: shop.id, adminId, expiry: "15m" });
    assert.ok(isWellFormedToken(token));
    assert.equal(link.tokenHash, hashOneTimeLoginToken(token));
    assert.notEqual(link.tokenHash, token);

    const r = await resolve().execute(token);
    assert.equal(r.kind, "ok");
    if (r.kind === "ok") {
      assert.ok(r.accounts.some((u) => u.id === ownerId));
      assert.ok(r.accounts.every((u) => u.role !== "platform_admin"));
    }
    // viewing does not consume
    assert.equal((await resolve().execute(token)).kind, "ok");

    const { user } = await consume().execute(token, ownerId);
    assert.equal(user.id, ownerId);
    await assert.rejects(() => consume().execute(token, ownerId));
    assert.equal((await resolve().execute(token)).kind, "invalid");
  });

  it("expired link fails", async () => {
    const { shop, ownerId } = await seedShop("otl-b");
    const past = new Date(Date.now() - 16 * 60_000);
    const { token } = await create().execute({ shopId: shop.id, adminId, expiry: "15m", now: past });
    assert.equal((await resolve().execute(token)).kind, "invalid");
    await assert.rejects(() => consume().execute(token, ownerId));
  });

  it("revoked link fails", async () => {
    const { shop, ownerId } = await seedShop("otl-c");
    const { token, link } = await create().execute({ shopId: shop.id, adminId, expiry: "1h" });
    assert.ok(await container.adminLoginLinkRepository.revoke(link.id, new Date().toISOString()));
    await assert.rejects(() => consume().execute(token, ownerId));
  });

  it("wrong-shop user and admin are rejected; link stays unused", async () => {
    const { shop } = await seedShop("otl-d");
    const other = await seedShop("otl-e");
    const { token } = await create().execute({ shopId: shop.id, adminId, expiry: "15m" });
    await assert.rejects(() => consume().execute(token, other.ownerId));
    await assert.rejects(() => consume().execute(token, adminId));
    assert.equal((await resolve().execute(token)).kind, "ok");
    await assert.rejects(() =>
      create().execute({ shopId: shop.id, adminId, expiry: "15m", targetUserId: other.ownerId }),
    );
  });

  it("pre-selected target limits the choice", async () => {
    const { shop, ownerId } = await seedShop("otl-f");
    const { token } = await create().execute({ shopId: shop.id, adminId, expiry: "24h", targetUserId: ownerId });
    const r = await resolve().execute(token);
    assert.ok(r.kind === "ok" && r.accounts.length === 1 && r.accounts[0].id === ownerId);
  });

  it("concurrent consume: only one wins", async () => {
    const { shop, ownerId } = await seedShop("otl-g");
    const { token } = await create().execute({ shopId: shop.id, adminId, expiry: "15m" });
    const res = await Promise.allSettled([
      consume().execute(token, ownerId),
      consume().execute(token, ownerId),
    ]);
    assert.equal(res.filter((x) => x.status === "fulfilled").length, 1);
  });

  it("admin self-login link: confirm logs in as that admin once; others rejected", async () => {
    const { ownerId } = await seedShop("otl-h");
    const mk = () =>
      new CreateAdminSelfLoginLinkUseCase(
        container.adminLoginLinkRepository,
        container.userRepository,
      );
    await assert.rejects(() => mk().execute({ adminUserId: ownerId, expiry: "15m" }));
    const { token, link } = await mk().execute({ adminUserId: adminId, expiry: "15m" });
    assert.equal(link.kind, "admin");
    assert.equal(link.shopId, null);
    const r = await resolve().execute(token);
    assert.ok(r.kind === "admin" && r.account.id === adminId);
    await assert.rejects(() => consume().execute(token, ownerId));
    const { user } = await consume().execute(token, adminId);
    assert.equal(user.role, "platform_admin");
    await assert.rejects(() => consume().execute(token, adminId));

    const past = new Date(Date.now() - 20 * 60_000);
    const old = await mk().execute({ adminUserId: adminId, expiry: "15m", now: past });
    assert.equal((await resolve().execute(old.token)).kind, "invalid");
  });

  it("admin UI issue: password re-auth required, non-admin rejected, 1h TTL saved", async () => {
    const hash = await container.passwordHasher.hash("CorrectHorse9!");
    const actor = await container.userRepository.create({
      email: "otl-ui-admin@test.local",
      passwordHash: hash,
      role: "platform_admin",
    });
    const { ownerId } = await seedShop("otl-i");
    const issue = () =>
      new IssueAdminLoginLinkUseCase(
        container.adminLoginLinkRepository,
        container.userRepository,
        {
          verifyPassword: async (id, pw) => {
            const u = await container.userRepository.findByIdWithSecret(id);
            return !!u && container.passwordHasher.compare(pw, u.passwordHash);
          },
          verifyTwoFactor: async () => false,
        },
      );
    await assert.rejects(() => issue().execute({ actorId: actor.id, expiry: "15m" }));
    await assert.rejects(() =>
      issue().execute({ actorId: actor.id, expiry: "15m", password: "wrong" }),
    );
    await assert.rejects(() =>
      issue().execute({ actorId: actor.id, expiry: "15m", code: "123456" }),
    );
    // non-admin actor
    await assert.rejects(() =>
      issue().execute({ actorId: ownerId, expiry: "15m", password: "password123" }),
    );
    // non-admin target
    await assert.rejects(() =>
      issue().execute({
        actorId: actor.id,
        targetAdminId: ownerId,
        expiry: "15m",
        password: "CorrectHorse9!",
      }),
    );
    const now = new Date();
    const { token, link } = await issue().execute({
      actorId: actor.id,
      targetAdminId: adminId,
      expiry: "1h",
      password: "CorrectHorse9!",
      now,
    });
    assert.equal(link.kind, "admin");
    assert.equal(link.targetUserId, adminId);
    assert.equal(link.createdBy, actor.id);
    assert.equal(Date.parse(link.expiresAt) - now.getTime(), 60 * 60_000);
    const r = await resolve().execute(token);
    assert.ok(r.kind === "admin" && r.account.id === adminId);

    const { shop } = await seedShop("otl-j");
    const sl = await create().execute({ shopId: shop.id, adminId, expiry: "1h", now });
    assert.equal(Date.parse(sl.link.expiresAt) - now.getTime(), 60 * 60_000);
  });
});
