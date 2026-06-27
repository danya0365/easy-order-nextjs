import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Migrate a fresh throwaway SQLite DB BEFORE the dev server serves any request.
// Runs as part of the Playwright `webServer` command (not globalSetup) so it is
// guaranteed to finish before the server boots — otherwise the readiness poll
// (or first request) hits a DB-backed route and the app caches a connection to
// an unmigrated DB, surfacing "no such table". TURSO_DATABASE_URL is provided by
// the webServer `env` (a file DB), so drizzle-kit targets it, not prod.
rmSync(".e2e.db", { force: true });
execSync("npx drizzle-kit migrate", { stdio: "inherit" });
