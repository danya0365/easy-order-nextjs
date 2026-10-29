import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { IAdminUserRepository } from "@/src/application/repositories/IAdminUserRepository";
import type { Role } from "@/src/domain/types/roles";
import { DrizzleUserRepository } from "./DrizzleUserRepository";

const users = new DrizzleUserRepository();

const u = schema.users;

async function reload(id: string) {
  const user = await users.findById(id);
  if (!user) throw new Error("user not found");
  return user;
}

export class DrizzleAdminUserRepository implements IAdminUserRepository {
  async setRole(id: string, role: Role, shopId: string | null, branchId: string | null) {
    await db
      .update(u)
      .set({
        role,
        shopId,
        branchId,
        ...(role === "platform_admin" ? {} : { isSuperadmin: false }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(u.id, id));
    return reload(id);
  }

  async grantSuperadmin(id: string) {
    await db
      .update(u)
      .set({ isSuperadmin: true, updatedAt: new Date().toISOString() })
      .where(and(eq(u.id, id), eq(u.role, "platform_admin")));
    return reload(id);
  }

  async revokeSuperadminIfNotLast(id: string) {
    const res = await db
      .update(u)
      .set({ isSuperadmin: false, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(u.id, id),
          sql`(select count(*) from users where is_superadmin = 1 and is_active = 1 and id <> ${id}) >= 1`,
        ),
      )
      .returning({ id: u.id });
    return res.length ? reload(id) : null;
  }

  async countActiveSuperadmins() {
    const [r] = await db
      .select({ n: sql<number>`count(*)` })
      .from(u)
      .where(and(eq(u.isSuperadmin, true), eq(u.isActive, true)));
    return Number(r?.n ?? 0);
  }
}
