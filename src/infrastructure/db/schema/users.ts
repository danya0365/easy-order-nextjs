import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { id, createdAt, updatedAt } from "./_shared";
import { shops } from "./shops";
import { branches } from "./branches";

export const USER_ROLES = [
  "platform_admin",
  "shop_owner",
  "branch_staff",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Operator accounts (login required).
 * Role invariants (enforced in use cases):
 *   platform_admin -> shopId null, branchId null
 *   shop_owner     -> shopId set,  branchId null
 *   branch_staff   -> shopId set,  branchId set
 */
export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text().notNull().unique(),
    passwordHash: text().notNull(),
    role: text({ enum: USER_ROLES }).notNull(),
    shopId: text().references(() => shops.id, { onDelete: "cascade" }),
    branchId: text().references(() => branches.id, { onDelete: "set null" }),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    // LINE Messaging API push target, set once the operator links their LINE
    // (via the webhook flow). lineLinkCode is the transient code they send in
    // chat to prove ownership; cleared on successful link. lineLinkCodeExpiresAt
    // bounds the code's validity (anti-brute-force) — null/past = no valid code.
    lineUserId: text().unique(),
    lineLinkCode: text(),
    lineLinkCodeExpiresAt: text(),
    // Passwordless login OTP (sent to LINE). loginOtpHash is a bcrypt hash of the
    // 6-digit code (never plaintext); loginOtpExpiresAt bounds validity;
    // loginOtpAttempts counts wrong tries so we can lock after too many. All
    // transient — cleared on successful verify.
    loginOtpHash: text(),
    loginOtpExpiresAt: text(),
    loginOtpAttempts: integer().notNull().default(0),
    // TOTP 2FA (admins). totpSecret is the base32 shared secret (pending until
    // confirmed); totpConfirmedAt non-null ⇒ 2FA is active; totpRecoveryCodes is
    // a JSON array of bcrypt-hashed single-use recovery codes. All server-only.
    totpSecret: text(),
    totpConfirmedAt: text(),
    totpRecoveryCodes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_shop_idx").on(t.shopId),
    index("users_branch_idx").on(t.branchId),
    index("users_line_link_code_idx").on(t.lineLinkCode),
  ],
);
