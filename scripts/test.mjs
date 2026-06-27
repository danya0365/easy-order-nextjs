// Runs the node:test suite over all `*.test.ts` files under src/ via the tsx
// loader. Node 20's --test does not glob .ts, so we enumerate files ourselves.
//
//   node scripts/test.mjs            # run all tests
//   node scripts/test.mjs --coverage # + experimental coverage report
//
// Integration tests point the DB client at an in-memory libSQL DB (set here for
// the whole run; unit tests don't touch the DB). Each test file runs in its own
// subprocess (node:test default isolation) → its own fresh in-memory DB.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

function findTests(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findTests(full, acc);
    else if (entry.name.endsWith(".test.ts")) acc.push(full);
  }
  return acc;
}

const coverage = process.argv.includes("--coverage");
// Scan both the library (src/) and the route handlers / boundaries (app/).
const files = [...findTests("src"), ...findTests("app")].sort();
if (files.length === 0) {
  console.error("No *.test.ts files found under src/");
  process.exit(1);
}

// `--experimental-test-module-mocks` enables mock.module() (used by action-layer
// tests to stub next/headers · next/cache · next/navigation). Harmless for tests
// that don't call it.
const args = ["--import", "tsx", "--test", "--experimental-test-module-mocks"];
if (coverage) args.push("--experimental-test-coverage");
args.push(...files);

const res = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    // tsx uses this tsconfig → maps server-only/client-only to an empty stub.
    TSX_TSCONFIG_PATH: "tsconfig.test.json",
    // Integration tests migrate this fresh in-memory DB per subprocess.
    TURSO_DATABASE_URL: ":memory:",
    TURSO_AUTH_TOKEN: "",
    // Mute the singleton logger so error-path tests don't flood output. Tests
    // that assert on logging construct their own Logger with explicit options.
    LOG_LEVEL: "silent",
  },
});
process.exit(res.status ?? 1);
