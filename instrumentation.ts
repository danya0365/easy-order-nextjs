/**
 * Next.js instrumentation hook — runs once at server startup (not at build).
 * We use it to fail fast on a broken environment before serving any request.
 */
export async function register() {
  // Only the Node.js server runtime has the full env + should validate.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/src/infrastructure/config/env");
    validateEnv();
  }
}
