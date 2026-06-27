// Applies versioned Drizzle migrations to the production Turso DB during the
// Vercel build, using the env vars (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN) set
// in the Vercel Production scope — so the DB credentials live in ONE place.
//
// Guarded by VERCEL_ENV so it runs only for Production deploys:
//   - "production" -> apply migrations (deploy aborts if a migration fails)
//   - "preview" / unset (local build) -> skip
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "local";

if (env === "production") {
  console.log("[migrate] VERCEL_ENV=production -> applying migrations");
  execSync("npm run db:migrate", { stdio: "inherit" });
} else {
  console.log(`[migrate] VERCEL_ENV=${env} -> skipping migrations`);
}
