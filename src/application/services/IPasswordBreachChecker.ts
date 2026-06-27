/**
 * Checks a password against known-breached corpora. Kept behind an interface so
 * use cases stay infrastructure-free; implementations MUST fail open (return
 * false on any error) so an outage can never lock users out of changing a password.
 */
export interface IPasswordBreachChecker {
  isBreached(password: string): Promise<boolean>;
}
