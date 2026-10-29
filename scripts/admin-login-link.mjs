#!/usr/bin/env node
/**
 * Issue a single-use admin self-login link (kind='admin') straight into Turso.
 *
 *   node scripts/admin-login-link.mjs --env staging|prod --email <admin email> [--ttl 15m|1h|24h]
 *
 * Needs DB creds: /workspace/secrets/easy-order-<env>-db.env (TURSO_DATABASE_URL /
 * TURSO_AUTH_TOKEN) or the same vars already in the environment.
 * The URL (contains the secret token) is written ONLY to
 * /workspace/secrets/admin-login-link-<env>.txt (chmod 600) — never stdout.
 * Only the SHA-256 hash of the token is stored in the DB.
 */
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const TTL = { "15m": 15 * 60_000, "1h": 60 * 60_000, "24h": 24 * 60 * 60_000 };
const ENVS = {
  staging: {
    baseUrl: "https://easy-order-dev.marosdee-fuzana.workers.dev",
    dbHost: "easy-order-staging",
  },
  prod: {
    baseUrl: "https://easy-order.marosdee-fuzana.workers.dev",
    dbHost: "easy-order-easy-ai-studio",
  },
};

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
}
function die(msg) {
  console.error(`admin-login-link: ${msg}`);
  process.exit(1);
}
function loadEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const envName = arg("env");
const email = arg("email");
const ttlKey = arg("ttl", "15m");
const secretsDir = arg("secrets-dir", "/workspace/secrets");
const baseUrl = arg("base-url");
if (!ENVS[envName]) die("--env must be staging or prod");
if (!email) die("--email is required");
if (!TTL[ttlKey]) die("--ttl must be 15m, 1h or 24h");

const envFile = `${secretsDir}/easy-order-${envName}-db.env`;
const fileVars = existsSync(envFile) ? loadEnvFile(envFile) : {};
const url = process.env.TURSO_DATABASE_URL || fileVars.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || fileVars.TURSO_AUTH_TOKEN;
if (!url) die(`no TURSO_DATABASE_URL (env or ${envFile})`);
if (!url.startsWith("file:") && !url.includes(ENVS[envName].dbHost)) {
  die(`DB URL does not look like the ${envName} database — refusing`);
}

const db = createClient({ url, authToken });
const users = await db.execute({
  sql: "select id, email, is_active from users where lower(email) = lower(?) and role = 'platform_admin'",
  args: [email],
});
const admin = users.rows[0];
if (!admin) die(`no platform_admin with email ${email}`);
if (!Number(admin.is_active)) die(`admin ${email} is inactive`);

const cols = await db.execute("select name from pragma_table_info('admin_login_links')");
const names = cols.rows.map((r) => r.name);
if (!names.includes("kind")) die("admin_login_links.kind missing — apply migrations 0017/0018 first");

const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
const id = randomBytes(15).toString("base64url");
const now = new Date();
const expiresAt = new Date(now.getTime() + TTL[ttlKey]).toISOString();

await db.batch(
  [
    {
      sql: `insert into admin_login_links (id, kind, shop_id, token_hash, created_by, target_user_id, created_at, expires_at)
            values (?, 'admin', null, ?, ?, ?, ?, ?)`,
      args: [id, tokenHash, admin.id, admin.id, now.toISOString(), expiresAt],
    },
    {
      sql: `insert into audit_logs (id, actor_user_id, actor_role, action, target_type, target_id, shop_id, ip, user_agent, metadata, created_at)
            values (?, null, 'cli', 'one_time_login_link_created', 'admin_login_link', ?, null, null, 'scripts/admin-login-link.mjs', ?, ?)`,
      args: [
        randomBytes(15).toString("base64url"),
        id,
        JSON.stringify({ kind: "admin", targetUserId: admin.id, ttl: ttlKey, expiresAt }),
        now.toISOString(),
      ],
    },
  ],
  "write",
);

const outFile = arg("out", `${secretsDir}/admin-login-link-${envName}.txt`);
const link = `${baseUrl || ENVS[envName].baseUrl}/login/one-time?t=${token}`;
writeFileSync(outFile, `${link}\n# admin: ${admin.email}\n# expires_at (UTC): ${expiresAt}\n# link id: ${id}\n`, { mode: 0o600 });
chmodSync(outFile, 0o600);
console.log(`ok: link ${id} for ${admin.email} (${envName}), expires_at ${expiresAt} UTC → written to ${outFile}`);
