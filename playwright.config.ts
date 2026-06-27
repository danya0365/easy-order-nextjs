import { defineConfig } from "@playwright/test";

const PORT = 3100;

// E2E smoke: boots the real Next app against a fresh migrated SQLite file and
// checks public pages render end-to-end. Business logic is covered by the fast
// unit/integration suite (npm test); E2E only verifies the app wires together.
export default defineConfig({
  testDir: "tests/e2e",
  // Give `next dev` cold-compile headroom; retry on CI for residual slowness.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    // Migrate the throwaway DB as part of the command so it finishes BEFORE the
    // server serves anything — running it in globalSetup races the readiness
    // poll and the app would cache a connection to an unmigrated DB.
    command: `node tests/e2e/migrate-e2e.mjs && next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      TURSO_DATABASE_URL: "file:./.e2e.db",
      TURSO_AUTH_TOKEN: "",
    },
  },
});
