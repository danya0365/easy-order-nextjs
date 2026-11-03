#!/usr/bin/env node
/**
 * One-off: carry value from the RETIRED day-top-up / daily-fee billing into the
 * prepaid credit wallet. Old tables are left untouched (read only).
 *
 *   node scripts/convert-old-billing-to-credit.mjs --env staging|prod [--apply]
 *
 * Dry-run by default (prints counts only, no writes). --apply is refused for prod.
 *
 * Rules:
 *  1. Paid remaining days — a subscription with ≥1 APPROVED payment whose
 *     current_period_due_at is still in the future: remaining whole days ×
 *     price_per_day_satang → credit ledger "adjust" (key convert:sub:<subId>).
 *     Trial-only subscriptions (no approved payment) carry nothing.
 *  2. PENDING payment slips → pending credit_topups (same slip + amount) so the
 *     admin reviews them in /admin/credit/topups (note "convert:payment:<id>").
 *  3. Outstanding daily_fee_charges with status "due" are forgiven (reported only).
 */
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";

const ENVS = { staging: "easy-order-staging", prod: "easy-order-easy-ai-studio" };
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const apply = process.argv.includes("--apply");
const envName = arg("env");
const die = (m) => { console.error(`convert-old-billing: ${m}`); process.exit(1); };
if (!ENVS[envName]) die("--env must be staging or prod");
if (apply && envName === "prod") die("--apply is not allowed on prod (dry-run counts only)");

const envFile = `/workspace/secrets/easy-order-${envName}-db.env`;
const vars = {};
if (existsSync(envFile)) for (const l of readFileSync(envFile, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const url = process.env.TURSO_DATABASE_URL || vars.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || vars.TURSO_AUTH_TOKEN;
if (!url) die("no TURSO_DATABASE_URL");
if (!url.startsWith("file:") && !url.includes(ENVS[envName])) die(`DB URL is not the ${envName} database — refusing`);
const db = createClient({ url, authToken });
const nid = () => randomBytes(15).toString("base64url").slice(0, 21);
const DAY = 86_400_000;
const now = Date.now();

const subs = (await db.execute(`select s.id, s.shop_id, s.status, s.price_per_day_satang p, s.current_period_due_at due,
  (select count(*) from payments x where x.subscription_id = s.id and x.status = 'approved') paid from subscriptions s`)).rows;
const carry = subs
  .map((s) => ({ ...s, days: Math.max(0, Math.ceil((Date.parse(s.due) - now) / DAY)) }))
  .filter((s) => Number(s.paid) > 0 && s.days > 0)
  .map((s) => ({ ...s, amount: s.days * Number(s.p) }));
const pending = (await db.execute("select id, shop_id, amount_satang, slip_url, submitted_by, package_id, created_at from payments where status = 'pending'")).rows;
const due = (await db.execute("select count(*) n, coalesce(sum(amount_satang),0) s from daily_fee_charges where status = 'due'")).rows[0];
const counts = {
  env: envName, mode: apply ? "apply" : "dry-run",
  subscriptions: subs.length,
  trialOrUnpaid: subs.filter((s) => Number(s.paid) === 0).length,
  paidRemainingToConvert: carry.length,
  paidRemainingSatang: carry.reduce((a, s) => a + s.amount, 0),
  pendingPaymentsToConvert: pending.length,
  topupTransactions: Number((await db.execute("select count(*) n from topup_transactions")).rows[0].n),
  dueDailyFeesForgiven: Number(due.n), dueDailyFeesSatang: Number(due.s),
};
let written = { ledger: 0, topups: 0, skipped: 0 };
if (apply) {
  for (const s of carry) {
    const key = `convert:sub:${s.id}`;
    if ((await db.execute({ sql: "select 1 from credit_ledger where idempotency_key = ?", args: [key] })).rows.length) { written.skipped++; continue; }
    const ts = new Date().toISOString();
    const bal = Number((await db.execute({ sql: "select balance_satang b from credit_wallets where shop_id = ?", args: [s.shop_id] })).rows[0]?.b ?? 0) + s.amount;
    await db.batch([
      { sql: "insert into credit_wallets (shop_id, balance_satang, created_at, updated_at) values (?, ?, ?, ?) on conflict(shop_id) do update set balance_satang = excluded.balance_satang, updated_at = excluded.updated_at", args: [s.shop_id, bal, ts, ts] },
      { sql: "insert into credit_ledger (id, shop_id, type, amount_satang, balance_after_satang, reason, idempotency_key, meta, created_at) values (?, ?, 'adjust', ?, ?, ?, ?, ?, ?)", args: [nid(), s.shop_id, s.amount, bal, `แปลงวันใช้งานคงเหลือ ${s.days} วัน จากระบบเดิม`, key, JSON.stringify({ subscriptionId: s.id, days: s.days, pricePerDaySatang: Number(s.p) }), ts] },
    ], "write");
    written.ledger++;
  }
  for (const p of pending) {
    const note = `convert:payment:${p.id}`;
    if ((await db.execute({ sql: "select 1 from credit_topups where note = ?", args: [note] })).rows.length) { written.skipped++; continue; }
    await db.execute({ sql: "insert into credit_topups (id, shop_id, package_id, amount_satang, bonus_satang, slip_url, status, note, submitted_by, created_at) values (?, ?, null, ?, 0, ?, 'pending', ?, ?, ?)", args: [nid(), p.shop_id, p.amount_satang, p.slip_url, note, p.submitted_by, p.created_at] });
    written.topups++;
  }
}
console.log(JSON.stringify({ ...counts, ...(apply ? { written } : {}) }, null, 2));
