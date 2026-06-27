/** Structured fields attached to a log line (kept JSON-serializable). */
export type LogFields = Record<string, unknown>;

/**
 * Vendor-neutral logging + error-reporting seam. The infrastructure layer
 * provides the real implementation (structured output + an optional error
 * sink); application services depend only on this interface so they never
 * import a concrete logger or `console`.
 */
export interface ILogger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /**
   * Report an unexpected exception: logs it at error level AND forwards it to
   * the configured error tracker (a no-op until one is wired). Never throws.
   */
  captureException(error: unknown, fields?: LogFields): void;
}

/** A logger that discards everything — safe default for tests / optional deps. */
export const noopLogger: ILogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  captureException() {},
};
