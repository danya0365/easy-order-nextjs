import type { User, UserWithSecret } from "@/src/domain/entities";
import type { Role } from "@/src/domain/types/roles";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: Role;
  shopId?: string | null;
  branchId?: string | null;
}

export interface IUserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  /** Includes the password hash — for login verification only. */
  findByEmailWithSecret(email: string): Promise<UserWithSecret | null>;
  /** Includes the password hash — for verifying the current password on change. */
  findByIdWithSecret(id: string): Promise<UserWithSecret | null>;
  listByShop(shopId: string): Promise<User[]>;
  listByRole(role: Role): Promise<User[]>;
  /** All users, oldest first. Used by the dev-only login switcher. */
  list(): Promise<User[]>;
  setActive(id: string, isActive: boolean): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<User>;
  /** LINE account linking. */
  setLineUserId(id: string, lineUserId: string | null): Promise<User>;
  setLineLinkCode(
    id: string,
    code: string | null,
    expiresAt: string | null,
  ): Promise<User>;
  /** Returns the user whose UNEXPIRED link code matches, or null. */
  findByLineLinkCode(code: string): Promise<User | null>;
  /** Passwordless login OTP (bcrypt-hashed). Sets hash+expiry, resets attempts. */
  setLoginOtp(id: string, otpHash: string, expiresAt: string): Promise<void>;
  /** Reads the current OTP state, or null if the user does not exist. */
  getLoginOtp(
    id: string,
  ): Promise<{ hash: string | null; expiresAt: string | null; attempts: number } | null>;
  /** Increments the wrong-attempt counter; returns the new count. */
  bumpLoginOtpAttempts(id: string): Promise<number>;
  /** Clears the OTP (hash/expiry null, attempts 0) after success or invalidation. */
  clearLoginOtp(id: string): Promise<void>;
  /** TOTP 2FA: store the pending base32 secret (not yet active), or null to clear. */
  setTotpSecret(id: string, secret: string | null): Promise<void>;
  /** Activate 2FA: mark confirmed (now) and store the hashed recovery codes. */
  enableTotp(id: string, recoveryHashes: string[]): Promise<void>;
  /** Turn off 2FA entirely (clears secret, confirmation, recovery codes). */
  disableTotp(id: string): Promise<void>;
  /** Replace the stored recovery-code hashes (e.g. after consuming one). */
  setTotpRecoveryCodes(id: string, recoveryHashes: string[]): Promise<void>;
  /** Reads the raw TOTP state (secret + confirmation + recovery hashes), or null. */
  getTotpState(id: string): Promise<{
    secret: string | null;
    confirmedAt: string | null;
    recoveryCodes: string[];
  } | null>;
}
