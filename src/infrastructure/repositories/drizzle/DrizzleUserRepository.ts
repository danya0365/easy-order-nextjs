import "server-only";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/src/infrastructure/db/client";
import type { User, UserWithSecret } from "@/src/domain/entities";
import type { Role } from "@/src/domain/types/roles";
import type {
  CreateUserInput,
  IUserRepository,
} from "@/src/application/repositories/IUserRepository";

type Row = typeof schema.users.$inferSelect;

function toUser(row: Row): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    shopId: row.shopId,
    branchId: row.branchId,
    isActive: row.isActive,
    lineUserId: row.lineUserId,
    totpEnabled: !!row.totpConfirmedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserRepository implements IUserRepository {
  async create(input: CreateUserInput): Promise<User> {
    const [row] = await db
      .insert(schema.users)
      .values({
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        shopId: input.shopId ?? null,
        branchId: input.branchId ?? null,
      })
      .returning();
    return toUser(row);
  }

  async findById(id: string): Promise<User | null> {
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    return row ? toUser(row) : null;
  }

  async findByEmailWithSecret(email: string): Promise<UserWithSecret | null> {
    const row = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    return row ? { ...toUser(row), passwordHash: row.passwordHash } : null;
  }

  async findByIdWithSecret(id: string): Promise<UserWithSecret | null> {
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    return row ? { ...toUser(row), passwordHash: row.passwordHash } : null;
  }

  async listByShop(shopId: string): Promise<User[]> {
    const rows = await db.query.users.findMany({
      where: eq(schema.users.shopId, shopId),
    });
    return rows.map(toUser);
  }

  async listByRole(role: Role): Promise<User[]> {
    const rows = await db.query.users.findMany({
      where: eq(schema.users.role, role),
    });
    return rows.map(toUser);
  }

  async list(): Promise<User[]> {
    const rows = await db.query.users.findMany({
      orderBy: asc(schema.users.createdAt),
    });
    return rows.map(toUser);
  }

  async setActive(id: string, isActive: boolean): Promise<User> {
    const [row] = await db
      .update(schema.users)
      .set({ isActive })
      .where(eq(schema.users.id, id))
      .returning();
    return toUser(row);
  }

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    const [row] = await db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, id))
      .returning();
    return toUser(row);
  }

  async setLineUserId(id: string, lineUserId: string | null): Promise<User> {
    const [row] = await db
      .update(schema.users)
      .set({ lineUserId })
      .where(eq(schema.users.id, id))
      .returning();
    return toUser(row);
  }

  async setLineLinkCode(
    id: string,
    code: string | null,
    expiresAt: string | null,
  ): Promise<User> {
    const [row] = await db
      .update(schema.users)
      .set({ lineLinkCode: code, lineLinkCodeExpiresAt: expiresAt })
      .where(eq(schema.users.id, id))
      .returning();
    return toUser(row);
  }

  async findByLineLinkCode(code: string): Promise<User | null> {
    // Only an unexpired code matches (null expiry never matches via gt()).
    const row = await db.query.users.findFirst({
      where: and(
        eq(schema.users.lineLinkCode, code),
        gt(schema.users.lineLinkCodeExpiresAt, new Date().toISOString()),
      ),
    });
    return row ? toUser(row) : null;
  }

  async setLoginOtp(
    id: string,
    otpHash: string,
    expiresAt: string,
  ): Promise<void> {
    await db
      .update(schema.users)
      .set({
        loginOtpHash: otpHash,
        loginOtpExpiresAt: expiresAt,
        loginOtpAttempts: 0,
      })
      .where(eq(schema.users.id, id));
  }

  async getLoginOtp(
    id: string,
  ): Promise<{ hash: string | null; expiresAt: string | null; attempts: number } | null> {
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!row) return null;
    return {
      hash: row.loginOtpHash,
      expiresAt: row.loginOtpExpiresAt,
      attempts: row.loginOtpAttempts,
    };
  }

  async bumpLoginOtpAttempts(id: string): Promise<number> {
    const [row] = await db
      .update(schema.users)
      .set({ loginOtpAttempts: sql`${schema.users.loginOtpAttempts} + 1` })
      .where(eq(schema.users.id, id))
      .returning();
    return row?.loginOtpAttempts ?? 0;
  }

  async clearLoginOtp(id: string): Promise<void> {
    await db
      .update(schema.users)
      .set({ loginOtpHash: null, loginOtpExpiresAt: null, loginOtpAttempts: 0 })
      .where(eq(schema.users.id, id));
  }

  async setTotpSecret(id: string, secret: string | null): Promise<void> {
    // Setting a new pending secret also clears any prior confirmation/recovery.
    await db
      .update(schema.users)
      .set({
        totpSecret: secret,
        totpConfirmedAt: null,
        totpRecoveryCodes: null,
      })
      .where(eq(schema.users.id, id));
  }

  async enableTotp(id: string, recoveryHashes: string[]): Promise<void> {
    await db
      .update(schema.users)
      .set({
        totpConfirmedAt: new Date().toISOString(),
        totpRecoveryCodes: JSON.stringify(recoveryHashes),
      })
      .where(eq(schema.users.id, id));
  }

  async disableTotp(id: string): Promise<void> {
    await db
      .update(schema.users)
      .set({ totpSecret: null, totpConfirmedAt: null, totpRecoveryCodes: null })
      .where(eq(schema.users.id, id));
  }

  async setTotpRecoveryCodes(id: string, recoveryHashes: string[]): Promise<void> {
    await db
      .update(schema.users)
      .set({ totpRecoveryCodes: JSON.stringify(recoveryHashes) })
      .where(eq(schema.users.id, id));
  }

  async getTotpState(id: string): Promise<{
    secret: string | null;
    confirmedAt: string | null;
    recoveryCodes: string[];
  } | null> {
    const row = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!row) return null;
    let recoveryCodes: string[] = [];
    if (row.totpRecoveryCodes) {
      try {
        const parsed: unknown = JSON.parse(row.totpRecoveryCodes);
        if (Array.isArray(parsed)) recoveryCodes = parsed.filter((c): c is string => typeof c === "string");
      } catch {
        /* corrupt JSON → treat as no recovery codes */
      }
    }
    return {
      secret: row.totpSecret,
      confirmedAt: row.totpConfirmedAt,
      recoveryCodes,
    };
  }
}
