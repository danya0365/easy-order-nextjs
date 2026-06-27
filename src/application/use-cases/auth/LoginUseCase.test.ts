/**
 * Tests for password login + OTP-only enforcement.
 * Run: npx tsx --test src/application/use-cases/auth/LoginUseCase.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { LoginUseCase } from "./LoginUseCase";
import type { Role } from "@/src/domain/types/roles";
import type { IUserRepository } from "@/src/application/repositories/IUserRepository";
import type { IPasswordHasher } from "@/src/application/services/IPasswordHasher";

const hasher: IPasswordHasher = {
  async hash(p) {
    return "h:" + p;
  },
  async compare(p, h) {
    return h === "h:" + p;
  },
};

function repoWith(opts: { role: Role; lineUserId: string | null; isActive?: boolean }) {
  return {
    async findByEmailWithSecret(email: string) {
      if (email !== "u@x.test") return null;
      return {
        id: "u1",
        email: "u@x.test",
        role: opts.role,
        shopId: "s1",
        branchId: null,
        isActive: opts.isActive ?? true,
        lineUserId: opts.lineUserId,
        createdAt: "",
        updatedAt: "",
        passwordHash: "h:secret",
      };
    },
  } as unknown as IUserRepository;
}

test("password works for unlinked owner", async () => {
  const uc = new LoginUseCase(repoWith({ role: "shop_owner", lineUserId: null }), hasher);
  const user = await uc.execute("u@x.test", "secret");
  assert.ok(user);
  assert.equal(user!.id, "u1");
});

test("password REJECTED for linked owner (OTP-only)", async () => {
  const uc = new LoginUseCase(repoWith({ role: "shop_owner", lineUserId: "U1" }), hasher);
  assert.equal(await uc.execute("u@x.test", "secret"), null);
});

test("password REJECTED for linked staff (OTP-only)", async () => {
  const uc = new LoginUseCase(repoWith({ role: "branch_staff", lineUserId: "U1" }), hasher);
  assert.equal(await uc.execute("u@x.test", "secret"), null);
});

test("password still works for linked admin (break-glass)", async () => {
  const uc = new LoginUseCase(repoWith({ role: "platform_admin", lineUserId: "U1" }), hasher);
  const user = await uc.execute("u@x.test", "secret");
  assert.ok(user);
});

test("wrong password -> null", async () => {
  const uc = new LoginUseCase(repoWith({ role: "shop_owner", lineUserId: null }), hasher);
  assert.equal(await uc.execute("u@x.test", "nope"), null);
});
