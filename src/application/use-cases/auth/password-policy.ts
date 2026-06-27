import type { IPasswordBreachChecker } from "@/src/application/services/IPasswordBreachChecker";

/** Minimum password length, matching the create-user forms. */
export const MIN_PASSWORD_LENGTH = 10;

/** Throw a Thai error if the password fails the length policy (sync, pure). */
export function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
  }
}

/**
 * Full policy check used when a user SETS a password: length + a breached-password
 * lookup (HIBP, fail-open). Reject passwords known to be in breach corpora.
 */
export async function assertPasswordAcceptable(
  password: string,
  breachChecker: IPasswordBreachChecker,
): Promise<void> {
  assertValidPassword(password);
  if (await breachChecker.isBreached(password)) {
    throw new Error(
      "รหัสผ่านนี้เคยรั่วไหลในเหตุข้อมูลรั่ว กรุณาเลือกรหัสผ่านอื่นที่ไม่เคยใช้ที่อื่น",
    );
  }
}
