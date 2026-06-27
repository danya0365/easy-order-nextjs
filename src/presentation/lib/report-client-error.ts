/**
 * Fire-and-forget client → server error beacon. Safe to call from any client
 * component (including `app/global-error.tsx`, which renders outside the app's
 * providers): it touches only `fetch`/`location` and swallows every failure, so
 * it can never throw inside an error boundary. The server route forwards the
 * report to the structured logger + error tracker.
 */
export function reportClientError(
  error: unknown,
  extra?: { digest?: string; componentStack?: string },
): void {
  try {
    const body = JSON.stringify({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      digest: extra?.digest,
      componentStack: extra?.componentStack,
      url: typeof location !== "undefined" ? location.href : undefined,
    });
    // keepalive lets the POST outlive the error page unmounting / navigating.
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let reporting break the error boundary */
  }
}
