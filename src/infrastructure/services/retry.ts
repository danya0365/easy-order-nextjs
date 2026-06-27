/**
 * Run `fn`, retrying on failure with exponential backoff. Generic + dependency-
 * free (inject `sleep` in tests to avoid real delays).
 *
 * Use for plain `fetch` calls to flaky external APIs. NOTE: the AWS SDK
 * (R2/S3) already retries transient errors internally, so don't wrap those.
 */
export interface RetryOptions {
  /** Retries AFTER the first attempt (default 2 → up to 3 attempts total). */
  retries?: number;
  /** Backoff base in ms; delay = baseDelayMs * 2**attempt (default 200). */
  baseDelayMs?: number;
  /** Return false to stop retrying a given error (default: retry everything). */
  shouldRetry?: (err: unknown) => boolean;
  /** Called before each retry (e.g. to log). */
  onRetry?: (err: unknown, nextAttempt: number) => void;
  /** Injectable delay (default: real setTimeout). */
  sleep?: (ms: number) => Promise<void>;
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 200;
  const sleep =
    opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const more = attempt < retries;
      if (!more || (opts.shouldRetry && !opts.shouldRetry(err))) break;
      opts.onRetry?.(err, attempt + 2); // human-friendly 1-based "next attempt"
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}
