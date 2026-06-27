/**
 * Time-based one-time password (RFC 6238) for admin 2FA. Kept behind an
 * interface (like IPasswordHasher) so use cases stay infrastructure-free.
 */
export interface ITotpService {
  /** A fresh base32 secret to provision into an authenticator app. */
  generateSecret(): string;
  /** otpauth:// URI (for the QR code) binding the secret to an account label. */
  keyUri(secret: string, accountLabel: string): string;
  /** True if `token` matches the secret within a small time window. */
  verify(secret: string, token: string): boolean;
}
