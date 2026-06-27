/**
 * Suggest an easy-to-read password (no ambiguous characters like 0/O, 1/l).
 * Default length 12 clears the 10-char minimum in `assertValidPassword`; being
 * random keeps it out of breach corpora (`assertPasswordAcceptable`).
 */
export function genPassword(length = 12): string {
  // 32-char alphabet → indexing a uint32 by `% 32` is unbiased (2**32 is
  // divisible by 32). Use CSPRNG (Web Crypto, available in browser + Node ≥18)
  // — these passwords are set for real accounts, so Math.random is unsafe.
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < length; i++) {
    s += chars[buf[i] % chars.length];
  }
  return s;
}
