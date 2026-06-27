/**
 * Seed orchestrator. Runs one or both data profiles:
 *
 *   production — admin + shop categories + ONE real example shop. Prod-safe.
 *   mock       — fake-but-realistic dev/demo data (shops/customers/menu/orders). DEV ONLY.
 *
 * The target DB comes from TURSO_DATABASE_URL (defaults to file:./local.db).
 * Pass --env=<file> to load a specific env file first (e.g. seed a remote Turso
 * by pointing at .env.production.local); otherwise .env.local is loaded if present.
 *
 * Usage:
 *   npm run db:seed                                    → production + mock (dev)
 *   npm run db:seed:prod                               → production only
 *   npm run db:seed:prod -- --env=.env.production.local  → seed remote prod
 *   tsx scripts/seed.ts mock --env=.env.local          → one profile, explicit env
 *   tsx scripts/seed.ts mock --force                   → allow mock on a remote DB
 *
 * Every profile is idempotent, so re-running is safe.
 */
import { parseArgs, parseEnv } from "node:util";
import { readFileSync } from "node:fs";

import bcrypt from "bcryptjs";

import {
  createSeedDb,
  isRemoteDb,
  DEFAULT_PASSWORD,
  type SeedContext,
} from "./seed/_db";
import { seedProduction } from "./seed/production";
import { seedMock } from "./seed/mock";

const PROFILES = {
  production: seedProduction,
  mock: seedMock,
} as const;
type Profile = keyof typeof PROFILES;
const ALL: Profile[] = ["production", "mock"];

function isProfile(s: string): s is Profile {
  return s in PROFILES;
}

/** Load the chosen env file (or .env.local by default) and return its label. */
function loadEnv(envFile: string | undefined): string {
  if (envFile) {
    // An explicit file is the source of truth → override ambient env.
    let content: string;
    try {
      content = readFileSync(envFile, "utf8");
    } catch {
      throw new Error(`ไม่พบไฟล์ env: ${envFile}`);
    }
    Object.assign(process.env, parseEnv(content));
    return envFile;
  }
  try {
    // Convenience default; does NOT override anything already in the environment.
    process.loadEnvFile(".env.local");
    return ".env.local (default)";
  } catch {
    return "(ambient process env)";
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      env: { type: "string", short: "e" },
      force: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log("Usage: tsx scripts/seed.ts [production|mock] [--env=<file>] [--force]");
    return;
  }

  const unknown = positionals.filter((p) => !isProfile(p));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown profile(s): ${unknown.join(", ")}. Use: ${ALL.join(", ")}`,
    );
  }
  const selected: Profile[] = positionals.length > 0 ? (positionals as Profile[]) : ALL;

  const envLabel = loadEnv(values.env);
  const target = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const remote = isRemoteDb();

  // All remote-safety policy lives here — profile modules carry no guards.
  if (remote && selected.includes("mock") && !values.force) {
    throw new Error(
      "Refusing to seed MOCK data into a remote DB. Run `production` for a real " +
        "launch, or pass --force to override.",
    );
  }
  if (remote && selected.includes("production")) {
    // Both accounts created on prod need a real password (no in-app change).
    const missing = ["SEED_ADMIN_PASSWORD", "SEED_DEMO_OWNER_PASSWORD"].filter(
      (k) => !process.env[k],
    );
    if (missing.length > 0) {
      throw new Error(
        `${missing.join(" and ")} required when seeding production data to a remote DB.`,
      );
    }
  }

  console.log(`▶ Env: ${envLabel} → DB: ${target}`);
  console.log(`▶ Seeding: ${selected.join(", ")}`);

  const { db, client } = createSeedDb();
  const ctx: SeedContext = {
    db,
    passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
    log: (msg) => console.log(`  ${msg}`),
  };

  for (const profile of selected) {
    await PROFILES[profile](ctx);
  }

  console.log(`\nLogins (password: ${DEFAULT_PASSWORD})`);
  if (selected.includes("production")) {
    console.log("  admin:        admin@easyorder.test");
    console.log("  example shop: owner@demo.easyorder.test");
  }
  if (selected.includes("mock")) {
    console.log("  mock owner:   owner@diner-a.test  (active — menu+kiosk ready, PIN 1234)");
    console.log("  mock owner:   owner@bakery-b.test  (overdue/suspended)");
    console.log("  mock staff:   staff1@diner-a.test");
  }
  console.log("\n✓ Seed complete");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
