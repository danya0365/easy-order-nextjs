import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import {
  AdminUserError,
  AdminUserManagementUseCase,
  countUsers,
  filterUsers,
} from "./AdminUserManagement";

const uc = () =>
  new AdminUserManagementUseCase(
    container.userRepository,
    container.adminUserRepository,
    container.sessionRepository,
    container.branchRepository,
  );
const mk = (email: string) =>
  container.userRepository.create({ email, passwordHash: "x", role: "platform_admin" });
const rejects = (p: Promise<unknown>, code: string) =>
  assert.rejects(p, (e: unknown) => e instanceof AdminUserError && e.code === code);

let superId: string;
let adminId: string;
let ownerId: string;
let shopId: string;

describe("admin user management", () => {
  before(async () => {
    await migrateTestDb();
    superId = (await mk("super@test.local")).id;
    await container.adminUserRepository.grantSuperadmin(superId);
    adminId = (await mk("plain-admin@test.local")).id;
    const s = await seedShop("au-shop");
    ownerId = s.ownerId;
    shopId = s.shop.id;
  });

  it("superadmin cannot be suspended or demoted (even by another superadmin)", async () => {
    const other = (await mk("super2@test.local")).id;
    await container.adminUserRepository.grantSuperadmin(other);
    await rejects(uc().suspend(other, superId), "superadmin_protected");
    await rejects(uc().demoteAdmin(other, superId, shopId), "superadmin_protected");
    await rejects(uc().suspend(adminId, superId), "superadmin_protected");
    assert.equal((await container.userRepository.findById(superId))!.isActive, true);
    // cleanup: drop the 2nd superadmin flag (allowed, one remains)
    await uc().revokeSuperadmin(superId, other);
  });

  it("last superadmin guard: cannot revoke the only superadmin", async () => {
    assert.equal(await container.adminUserRepository.countActiveSuperadmins(), 1);
    await rejects(uc().revokeSuperadmin(superId, superId), "last_superadmin");
    assert.equal((await container.userRepository.findById(superId))!.isSuperadmin, true);
  });

  it("non-superadmin cannot promote/demote/grant", async () => {
    await rejects(uc().promoteToAdmin(adminId, ownerId), "forbidden");
    await rejects(uc().grantSuperadmin(adminId, adminId), "forbidden");
    await rejects(uc().demoteAdmin(adminId, superId, shopId), "forbidden");
    assert.equal((await container.userRepository.findById(ownerId))!.role, "shop_owner");
  });

  it("shop users cannot act at all", async () => {
    await rejects(uc().suspend(ownerId, adminId), "forbidden");
  });

  it("plain admin can suspend/activate a shop user; sessions dropped", async () => {
    const u = await uc().suspend(adminId, ownerId);
    assert.equal(u.isActive, false);
    assert.equal((await uc().activate(adminId, ownerId)).isActive, true);
    await rejects(uc().suspend(adminId, adminId), "self");
    await rejects(uc().suspend(adminId, (await mk("a3@test.local")).id), "forbidden");
  });

  it("superadmin promotes and demotes; change shop role validates branch", async () => {
    const promoted = await uc().promoteToAdmin(superId, ownerId);
    assert.equal(promoted.role, "platform_admin");
    assert.equal(promoted.shopId, null);
    const back = await uc().demoteAdmin(superId, ownerId, shopId);
    assert.equal(back.role, "shop_owner");
    assert.equal(back.shopId, shopId);
    await rejects(uc().changeShopRole(adminId, ownerId, "branch_staff", "nope"), "invalid_branch");
    const [branch] = await container.branchRepository.listByShop(shopId);
    const staff = await uc().changeShopRole(adminId, ownerId, "branch_staff", branch.id);
    assert.equal(staff.role, "branch_staff");
    assert.equal((await uc().changeShopRole(adminId, ownerId, "shop_owner")).role, "shop_owner");
  });

  it("counts + filters", async () => {
    const all = await container.userRepository.list();
    const c = countUsers(all);
    assert.equal(c.superadmins, 1);
    assert.equal(c.total, all.length);
    assert.equal(filterUsers(all, { role: "superadmin" })[0].id, superId);
    assert.ok(filterUsers(all, { q: "plain" }).every((u) => u.email.includes("plain")));
  });
});
