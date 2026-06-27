import { randomBytes } from "node:crypto";

export const RECOVERY_CODE_COUNT = 10;

/** Human-typable single-use recovery codes, e.g. "A1B2C-D3E4F". */
export function generateRecoveryCodes(n = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: n }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/** Normalize user input before comparing against a stored recovery-code hash. */
export function normalizeRecoveryCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s/g, "");
}
