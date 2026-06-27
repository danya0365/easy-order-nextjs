// Stub for the build-time marker packages `server-only` / `client-only`, which
// Next.js aliases away at build time (their node_modules are empty). Mapped in
// tsconfig.test.json so server modules import cleanly under the test runner.
export {};
