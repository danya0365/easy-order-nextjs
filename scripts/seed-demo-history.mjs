#!/usr/bin/env node
// Simulate ~1 year of customer history for the STAGING demo shop (slug "demo").
//
//   set -a; . /workspace/secrets/easy-order-staging-db.env; set +a
//   node scripts/seed-demo-history.mjs            # (re)seed: deletes previous sim rows, then inserts
//   node scripts/seed-demo-history.mjs --reset    # delete only sim rows, insert nothing
//   node scripts/seed-demo-history.mjs --dry-run  # generate + print counts, no writes
//   [--seed=42] [--end=2026-10-29]
//
// Safety: refuses unless TURSO_DATABASE_URL contains "easy-order-staging" and the
// target shop slug is "demo". Every generated row has an id starting with "sim_"
// (customers, orders, order_items, loyalty points tx + balances, audit_logs,
// member_signup_attempts, shop_blocked_phones), so --reset touches nothing else.
// Aggregates mirror the app: line_total = unit*qty, total = subtotal + delivery
// fee, earn = floor(total / satang_per_point) on paid orders with a customer,
// redeem = -reward.points_cost, balances = sums of the ledger, daily order_no.
import { createClient } from "@libsql/client";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const url = process.env.TURSO_DATABASE_URL || "";
if (!url.includes("easy-order-staging")) {
  console.error("REFUSED: TURSO_DATABASE_URL must point at easy-order-staging");
  process.exit(2);
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const SLUG = "demo";
const P = "sim_";

const one = async (sql, a = []) => (await db.execute({ sql, args: a })).rows[0];
const all = async (sql, a = []) => (await db.execute({ sql, args: a })).rows;

const shop = await one("select * from shops where slug = ?", [SLUG]);
if (!shop || shop.slug !== SLUG) { console.error("REFUSED: demo shop not found"); process.exit(2); }
const SHOP = shop.id;

const SIM_TABLES = [
  "order_items", "loyalty_points_transactions", "loyalty_points_balances",
  "member_signup_attempts", "shop_blocked_phones", "audit_logs", "orders", "customers",
];
async function reset() {
  const out = {};
  for (const t of SIM_TABLES) {
    const r = await db.execute({ sql: `delete from ${t} where id like 'sim\\_%' escape '\\' and shop_id = ?`, args: [SHOP] });
    out[t] = r.rowsAffected;
  }
  return out;
}

if (args.reset) {
  console.log("reset (deleted sim rows):", await reset());
  process.exit(0);
}

// ---------- deterministic RNG ----------
let s = Number(args.seed ?? 20261029) >>> 0;
const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const sid = () => P + Array.from({ length: 17 }, () => ALPH[Math.floor(rnd() * ALPH.length)]).join("");

// ---------- reference data from the shop ----------
const owner = await one("select id from users where shop_id = ? and role = 'shop_owner' limit 1", [SHOP]);
const menu = (await all("select id, name, price_satang from menu_items where shop_id = ? and is_available = 1", [SHOP]))
  .map((m) => ({ id: m.id, name: m.name, price: Number(m.price_satang) }));
if (menu.length < 3) { console.error("demo menu too small"); process.exit(2); }
const pts = (await one("select satang_per_point from loyalty_points_settings where shop_id = ?", [SHOP]))?.satang_per_point ?? 10000;
const SPP = Number(pts);
const pointsOn = !!(shop.loyalty_enabled && shop.spend_points_enabled && shop.loyalty_allowed_by_admin);
const rewards = (await all("select id, name, points_cost from loyalty_points_rewards where shop_id = ? and is_active = 1", [SHOP]))
  .map((r) => ({ id: r.id, name: r.name, cost: Number(r.points_cost) }));
const FEE = Number(shop.delivery_fee_satang ?? 0);
const existingPhones = new Set((await all("select phone from customers where shop_id = ? and id not like 'sim\\_%' escape '\\'", [SHOP])).map((r) => r.phone));
const drinks = menu.filter((m) => /เอสเพรสโซ|ลาเต้|อเมริกาโน่|ชา|โกโก้|น้ำ|กาแฟ|นม/.test(m.name));
const mains = menu.filter((m) => !drinks.includes(m));

// ---------- time helpers (Asia/Bangkok = UTC+7, no DST) ----------
const BKK = 7 * 3600e3;
const END = Date.parse(`${args.end ?? "2026-10-29"}T00:00:00+07:00`) + 86400e3; // end of end-day BKK
const NOW = Math.min(Date.now(), END - 1);
const START = END - 366 * 86400e3;
const iso = (ms) => new Date(ms).toISOString();
const bkkDayKey = (ms) => new Date(ms + BKK).toISOString().slice(0, 10);
const RAMADAN = [Date.parse("2026-02-18T00:00:00+07:00"), Date.parse("2026-03-20T00:00:00+07:00")];
const EID = [[Date.parse("2026-03-20T00:00:00+07:00"), 3], [Date.parse("2026-05-27T00:00:00+07:00"), 2]];
const inRamadan = (ms) => ms >= RAMADAN[0] && ms < RAMADAN[1];
function dayWeight(dayStart) {
  const dow = new Date(dayStart + BKK).getUTCDay();
  let w = dow === 5 ? 0.85 : dow === 0 || dow === 6 ? 1.35 : 1; // Friday prayer dip, weekend peak
  if (inRamadan(dayStart)) w *= 0.55;
  for (const [d, n] of EID) if (dayStart >= d && dayStart < d + n * 86400e3) w *= 2.2;
  return w;
}
/** A realistic order time inside the given BKK day (lunch / dinner peaks; iftar in Ramadan). */
function timeInDay(dayStart) {
  let h;
  if (inRamadan(dayStart)) h = chance(0.8) ? 18 + rnd() * 2.5 : 20.5 + rnd() * 1.4; // iftar & after
  else {
    const x = rnd();
    h = x < 0.15 ? 8 + rnd() * 2.5 : x < 0.6 ? 11 + rnd() * 2.5 : x < 0.72 ? 14 + rnd() * 3 : 17.5 + rnd() * 3.5;
  }
  return dayStart + Math.floor(h * 3600e3) + ri(0, 59) * 1000;
}
const bkkDayStart = (ms) => Date.parse(bkkDayKey(ms) + "T00:00:00+07:00");
/** Pick a day near `ms` weighted by seasonality (rejection sampling within ±3 days). */
function seasonalDay(ms) {
  for (let i = 0; i < 6; i++) {
    const d = bkkDayStart(ms + ri(-3, 3) * 86400e3);
    if (d < START || d >= END) continue;
    if (rnd() < dayWeight(d) / 2.5) return d;
  }
  return bkkDayStart(Math.min(Math.max(ms, START), END - 1));
}

// ---------- people ----------
const FIRST_M = ["อับดุลเลาะ", "มูฮัมหมัด", "อิสมาแอ", "ซุลกิฟลี", "อาหมัด", "ฮาซัน", "รอซาลี", "มะรอนิง", "สุไลมาน", "ยูโซะ", "อารีฟีน", "ฟาอิส", "นิอาแซ", "อิบรอเฮง", "มะยูโซ๊ะ", "สมชาย", "ธนพล", "วีระ", "ณัฐพงศ์", "กิตติ"];
const FIRST_F = ["ฟาตีมะห์", "นูรีซัน", "ซารีฟะห์", "อามีเนาะ", "ไซนับ", "รอฮานี", "ฮาลีเมาะ", "นูรฮายาตี", "มารีแย", "ซูไรยา", "อัสมะ", "ยาวาฮีร์", "สุดารัตน์", "อรอุมา", "พิมพ์ชนก", "กนกวรรณ", "นภัสสร", "ศิริพร"];
const LAST = ["สาและ", "หะยีอาแว", "ดอเลาะ", "มะลี", "เจ๊ะเต๊ะ", "สะมะแอ", "บินอับดุลเลาะ", "ยูโซ๊ะ", "หะยีสาและ", "แวมะ", "อาแวกาจิ", "ดาโอ๊ะ", "ศรีสุข", "ทองดี", "แก้วมณี", "บุญมา"];
const NICK_PREFIX = ["คุณ", "", "", "ก๊ะ", "บัง", "เปาะจิ", "แบ"];
const AREAS = [
  "ต.บางนาค อ.เมืองนราธิวาส", "ต.ลำภู อ.เมืองนราธิวาส", "ต.กะลุวอเหนือ อ.เมืองนราธิวาส", "ต.โคกเคียน อ.เมืองนราธิวาส",
  "ต.กะลุวอ อ.เมืองนราธิวาส", "ต.มะนังตายอ อ.เมืองนราธิวาส", "ต.ตันหยงมัส อ.ระแงะ", "ต.ตะปอเยาะ อ.ยี่งอ",
];
const STREETS = ["ถ.พิชิตบำรุง", "ถ.ภูผาภักดี", "ถ.ปุยุด", "ถ.ระแงะมรรคา", "ถ.สุริยะประดิษฐ์", "ถ.โคกเคียน", "ซ.ประชาร่วมใจ", "ถ.เลียบชายทะเล"];
const NOTES_VIP = ["ลูกค้าประจำ ชอบลาเต้หวานน้อย", "สั่งทุกวันศุกร์หลังละหมาด", "ชอบโต๊ะริมหน้าต่าง", "VIP — สั่งจัดเลี้ยงบ่อย"];
const NOTES = ["แพ้ถั่ว", "ไม่ทานเผ็ด", "ไม่ใส่ผงชูรส", "แพ้อาหารทะเล — ระวังข้าวผัดกุ้ง", "ชอบหวานน้อย", "โทรก่อนส่ง", "ฝากของไว้ป้อมยาม"];
const usedPhones = new Set(existingPhones);
function phone(suspicious = false) {
  if (suspicious) {
    for (const p of ["0999999999", "0911111111", "0812121212", "0898765432", "0923456789"]) if (!usedPhones.has(p)) { usedPhones.add(p); return p; }
  }
  for (;;) {
    const p = "0" + pick(["6", "8", "9"]) + pick(["1", "2", "3", "4", "5", "6", "7", "8", "9"]) + String(ri(0, 9999999)).padStart(7, "0");
    const rest = p.slice(2);
    if (usedPhones.has(p) || /^(\d)\1+$/.test(rest) || /(\d)\1{4}/.test(rest)) continue;
    usedPhones.add(p);
    return p;
  }
}
const publicCodes = new Set();
const pcode = () => { for (;;) { const c = "SIM" + Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[ri(0, 31)]).join(""); if (!publicCodes.has(c)) { publicCodes.add(c); return c; } } };

// ---------- generate ----------
const N = Number(args.customers ?? 180);
const segFor = (i) => {
  const x = i / N;
  return x < 0.10 ? "vip" : x < 0.40 ? "regular" : x < 0.74 ? "occasional" : x < 0.94 ? "lapsed" : "special";
};
const customers = [], orders = [], items = [], ptx = [], audits = [], attempts = [], blocked = [];
const ownerId = owner?.id ?? null;
let specialIdx = 0;

function makeOrders(c, times) {
  for (const t of times) {
    const delivery = c.delivery && chance(0.7);
    const fulfil = delivery ? "delivery" : chance(0.55) ? "pickup" : "dine_in";
    const channel = delivery ? "online" : fulfil === "pickup" ? pick(["online", "online", "counter", "kiosk"]) : pick(["counter", "kiosk", "kiosk"]);
    orders.push({ t, c, fulfil, channel });
  }
}

for (let i = 0; i < N; i++) {
  const seg = segFor(i);
  const female = chance(0.5);
  const name = `${pick(NICK_PREFIX)}${pick(female ? FIRST_F : FIRST_M)}${chance(0.6) ? " " + pick(LAST) : ""}`.trim();
  const delivery = chance(0.35);
  const c = {
    id: sid(), seg, name, phone: "", code: pcode(), delivery,
    address: delivery ? `${ri(1, 299)}/${ri(1, 40)} ${pick(STREETS)} ${pick(AREAS)} จ.นราธิวาส 96000` : null,
    tags: [], note: null, status: "none", requestedAt: null, reviewedAt: null, rejectedAt: null,
    blockedAt: null, clearedAt: null, created: 0, firstOrder: 0,
  };
  // order times per segment
  let times = [];
  if (seg === "vip") {
    const start = START + ri(0, 40) * 86400e3;
    for (let t = start; t < NOW - 86400e3; t += ri(4, 9) * 86400e3) times.push(timeInDay(seasonalDay(t)));
    c.tags.push("vip");
    if (chance(0.5)) c.tags.push("ลูกค้าประจำ");
    c.note = pick(NOTES_VIP);
  } else if (seg === "regular") {
    const start = START + ri(0, 150) * 86400e3;
    for (let t = start; t < NOW - 86400e3; t += ri(20, 40) * 86400e3) times.push(timeInDay(seasonalDay(t)));
    if (chance(0.25)) c.tags.push("ลูกค้าประจำ");
  } else if (seg === "occasional") {
    const n = ri(1, 5);
    for (let k = 0; k < n; k++) times.push(timeInDay(seasonalDay(START + rnd() * (NOW - START - 86400e3))));
  } else if (seg === "lapsed") {
    const lastBefore = NOW - ri(60, 150) * 86400e3;
    const n = ri(2, 9);
    const span = Math.max(30, Math.floor((lastBefore - START) / 86400e3));
    for (let k = 0; k < n; k++) times.push(timeInDay(bkkDayStart(lastBefore - ri(0, span) * 86400e3)));
    times = times.filter((t) => t < lastBefore + 86400e3);
  }
  times.sort((a, b) => a - b);
  if (chance(0.18)) c.tags.push(pick(["แพ้ถั่ว", "ไม่เผ็ด", "ส่งบ้าน", "จัดเลี้ยง"]));
  if (!c.note && chance(0.15)) c.note = pick(NOTES);
  if (c.tags.includes("แพ้ถั่ว") && !c.note) c.note = "แพ้ถั่ว — แจ้งครัวทุกครั้ง";
  c.tags = [...new Set(c.tags)];

  const firstT = times[0] ?? NOW - ri(1, 300) * 86400e3;
  c.created = firstT - ri(0, 3) * 86400e3 - ri(60, 3600) * 1000;
  // signup channel: static (approved via QR) vs in-store
  const isStatic = delivery || chance(0.4);
  if (seg === "special") {
    const k = specialIdx++;
    if (k < 6) { // pending static-QR requests (last 24h; 2 suspicious)
      const susp = k < 2;
      c.phone = phone(susp);
      c.status = "pending"; c.requestedAt = NOW - ri(10, 22 * 60) * 60e3; c.created = c.requestedAt;
      times = []; c.tags = []; c.note = null;
      attempts.push({ id: sid(), customerId: c.id, phone: c.phone, ip: susp ? "simip_shared_1" : "simip_" + k, created: c.requestedAt });
      if (susp) attempts.push({ id: sid(), customerId: null, phone: c.phone, ip: "simip_shared_1", created: c.requestedAt - 120e3 });
    } else if (k < 8) { // rejected
      c.phone = phone(); c.status = "rejected"; c.requestedAt = NOW - ri(5, 40) * 86400e3; c.created = c.requestedAt;
      c.reviewedAt = c.requestedAt + ri(1, 20) * 3600e3; c.rejectedAt = c.reviewedAt; times = [];
      audits.push({ action: "customer_online_rejected", target: c.id, t: c.reviewedAt, meta: null });
    } else { // blocked (had a couple of orders)
      c.phone = phone(); c.created = NOW - ri(90, 200) * 86400e3;
      times = [timeInDay(bkkDayStart(c.created + 86400e3)), timeInDay(bkkDayStart(c.created + 20 * 86400e3))];
      c.blockedAt = NOW - ri(20, 60) * 86400e3; c.note = "ยกเลิกออเดอร์บ่อย / ไม่มารับของ";
      blocked.push({ id: sid(), phone: c.phone, t: c.blockedAt });
      audits.push({ action: "customer_blocked", target: c.id, t: c.blockedAt, meta: null });
    }
  } else {
    c.phone = phone();
    if (isStatic) {
      c.status = "approved"; c.requestedAt = c.created;
      c.reviewedAt = c.requestedAt + ri(5, 600) * 60e3;
      attempts.push({ id: sid(), customerId: c.id, phone: c.phone, ip: "simip_" + i, created: c.requestedAt });
      audits.push({ action: "customer_online_approved", target: c.id, t: c.reviewedAt, meta: null });
      if (seg === "vip" || (seg === "regular" && chance(0.5))) {
        c.clearedAt = c.reviewedAt + ri(7, 30) * 86400e3;
        if (c.clearedAt < NOW) audits.push({ action: "customer_new_member_cleared", target: c.id, t: c.clearedAt, meta: null });
        else c.clearedAt = null;
      }
    }
  }
  c.firstOrder = times[0] ?? null;
  customers.push(c);
  makeOrders(c, times.filter((t) => t > c.created && t < NOW));
}

// anonymous walk-ins (no customer), seasonal
const days = Math.round((END - START) / 86400e3);
for (let d = 0; d < days; d++) {
  const ds = START + d * 86400e3;
  if (ds > NOW) break;
  const n = Math.round(2.2 * dayWeight(ds) * (0.6 + rnd() * 0.8));
  for (let k = 0; k < n; k++) orders.push({ t: timeInDay(ds), c: null, fulfil: chance(0.5) ? "dine_in" : "pickup", channel: pick(["kiosk", "kiosk", "counter"]) });
}
// a few open orders today
const today = bkkDayStart(NOW);
const openPool = customers.filter((c) => (c.seg === "vip" || c.seg === "regular") && !c.blockedAt);
const openOwners = new Set();
for (let k = 0; k < 5; k++) {
  const c = pick(openPool); if (openOwners.has(c.id)) continue; openOwners.add(c.id);
  const t = Math.min(NOW - ri(3, 50) * 60e3, today + 23 * 3600e3);
  if (t < today) continue;
  orders.push({ t, c, fulfil: c.delivery ? "delivery" : "pickup", channel: "online", open: pick(["pending", "preparing", "ready"]) });
}
orders.sort((a, b) => a.t - b.t);
const walkinOpen = orders.filter((o) => !o.open && o.t >= NOW - 40 * 60e3);
for (const o of walkinOpen) o.t -= 3600e3; // nothing "in-flight" apart from the explicit open ones

// ---------- materialise orders / items / ledger ----------
const existingPerDay = new Map(
  (await all("select substr(datetime(created_at, '+7 hours'), 1, 10) d, count(*) n from orders where shop_id = ? and id not like 'sim\\_%' escape '\\' group by d", [SHOP]))
    .map((r) => [r.d, Number(r.n)]),
);
const seqPerDay = new Map();
const balances = new Map(); // customerId -> {cur, earned, redeemed}
const CANCEL_REASONS = ["ลูกค้ายกเลิก ไม่สะดวกรับ", "วัตถุดิบหมด", "ลูกค้าสั่งซ้ำ", "ติดต่อลูกค้าไม่ได้", "นอกพื้นที่จัดส่ง"];
for (const o of orders) {
  const key = bkkDayKey(o.t);
  const no = (seqPerDay.get(key) ?? existingPerDay.get(key) ?? 0) + 1;
  seqPerDay.set(key, no);
  o.id = sid(); o.no = no;
  // items
  const lines = [];
  const nMain = o.fulfil === "delivery" ? ri(1, 3) : ri(0, 2);
  const nDrink = ri(nMain ? 0 : 1, 2);
  const chosen = [...Array.from({ length: nMain }, () => pick(mains.length ? mains : menu)), ...Array.from({ length: nDrink }, () => pick(drinks.length ? drinks : menu))];
  if (!chosen.length) chosen.push(pick(menu));
  for (const m of chosen) {
    const ex = lines.find((l) => l.m.id === m.id);
    if (ex) ex.q++; else lines.push({ m, q: o.c?.seg === "vip" && chance(0.2) ? 2 : 1 });
  }
  if (o.fulfil === "delivery") { // respect the online min order
    while (lines.reduce((s, l) => s + l.m.price * l.q, 0) < Number(shop.min_order_satang ?? 0)) lines[0].q++;
  }
  o.subtotal = lines.reduce((s, l) => s + l.m.price * l.q, 0);
  o.total = o.subtotal + (o.fulfil === "delivery" ? FEE : 0);
  for (const l of lines) items.push({ id: sid(), order: o.id, m: l.m, q: l.q, t: o.t });
  // lifecycle
  if (o.open) {
    o.status = o.open; o.paid = o.open !== "pending" && chance(0.5);
  } else if (chance(o.c?.blockedAt ? 0.5 : 0.035)) {
    o.status = "cancelled"; o.paid = false; o.reason = pick(CANCEL_REASONS);
  } else { o.status = "completed"; o.paid = true; }
  o.method = o.channel === "online" || chance(0.45) ? "promptpay_qr" : "cash";
  o.paidAt = o.paid ? o.t + ri(1, 8) * 60e3 : null;
  o.readyAt = ["ready", "completed"].includes(o.status) ? o.t + ri(6, 25) * 60e3 : null;
  o.doneAt = o.status === "completed" ? o.readyAt + ri(2, 40) * 60e3 : null;
  o.updated = o.doneAt ?? o.paidAt ?? o.t;
  if (o.status === "cancelled") audits.push({ action: "order_cancelled", target: o.id, type: "order", t: o.t + ri(2, 30) * 60e3, meta: JSON.stringify({ to: "cancelled", reason: o.reason }) });
  // earn
  if (o.paid && o.c && pointsOn) {
    const p = Math.floor(o.total / SPP);
    if (p >= 1) {
      const b = balances.get(o.c.id) ?? { cur: 0, earned: 0, redeemed: 0, last: 0 };
      b.cur += p; b.earned += p; b.last = o.paidAt; balances.set(o.c.id, b);
      ptx.push({ id: sid(), c: o.c.id, type: "earn", q: p, by: null, order: o.id, reward: null, note: `รับแต้มจากออเดอร์ #${o.no}`, t: o.paidAt });
      // occasionally redeem at the counter right after
      if (rewards.length && chance(o.c.seg === "vip" ? 0.12 : 0.05)) {
        const affordable = rewards.filter((r) => r.cost <= b.cur);
        if (affordable.length) {
          const r = pick(affordable);
          b.cur -= r.cost; b.redeemed += r.cost;
          ptx.push({ id: sid(), c: o.c.id, type: "redeem", q: -r.cost, by: ownerId, order: null, reward: r.id, note: `แลกรางวัล: ${r.name}`, t: o.paidAt + 60e3 });
        }
      }
    }
  }
}

// ---------- write ----------
const counts = {
  customers: customers.length, orders: orders.length, order_items: items.length,
  loyalty_points_transactions: ptx.length, loyalty_points_balances: balances.size,
  audit_logs: audits.length, member_signup_attempts: attempts.length, shop_blocked_phones: blocked.length,
};
const seg = {}; for (const c of customers) seg[c.seg] = (seg[c.seg] ?? 0) + 1;
console.log("generated:", counts, "segments:", seg, "points rule: 1 pt per", SPP, "satang; pointsOn", pointsOn);
if (args["dry-run"]) process.exit(0);

console.log("reset previous sim rows:", await reset());

async function insertMany(table, cols, rows, chunk = 150) {
  const stmts = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    stmts.push({
      sql: `insert into ${table} (${cols.join(",")}) values ${part.map(() => `(${cols.map(() => "?").join(",")})`).join(",")}`,
      args: part.flat(),
    });
  }
  for (let i = 0; i < stmts.length; i += 20) await db.batch(stmts.slice(i, i + 20), "write");
}
const n = (v) => (v == null ? null : iso(v));

await insertMany("customers",
  ["id", "shop_id", "phone", "display_name", "public_code", "created_at", "updated_at", "online_order_status", "online_order_requested_at", "online_order_reviewed_at", "online_order_reviewed_by", "online_order_rejected_at", "note", "tags", "blocked_at", "blocked_by", "new_member_cleared_at"],
  customers.map((c) => [c.id, SHOP, c.phone, c.name, c.code, iso(c.created), iso(Math.max(c.created, c.reviewedAt ?? 0, c.blockedAt ?? 0)), c.status, n(c.requestedAt), n(c.reviewedAt), c.reviewedAt ? ownerId : null, n(c.rejectedAt), c.note, JSON.stringify(c.tags), n(c.blockedAt), c.blockedAt ? ownerId : null, n(c.clearedAt)]));
await insertMany("orders",
  ["id", "shop_id", "order_no", "status", "payment_method", "payment_status", "subtotal_satang", "total_satang", "note", "paid_at", "ready_at", "completed_at", "created_at", "updated_at", "customer_id", "customer_name", "customer_phone", "performed_by", "channel", "fulfillment_type", "delivery_address"],
  orders.map((o) => [o.id, SHOP, o.no, o.status, o.method, o.paid ? "paid" : "unpaid", o.subtotal, o.total, o.fulfil === "delivery" && chance(0.3) ? "โทรก่อนถึง" : null, n(o.paidAt), n(o.readyAt), n(o.doneAt), iso(o.t), iso(o.updated), o.c?.id ?? null, o.c?.name ?? null, o.c?.phone ?? null, o.channel === "counter" ? ownerId : null, o.channel, o.fulfil, o.fulfil === "delivery" ? o.c?.address ?? `ต.บางนาค อ.เมืองนราธิวาส จ.นราธิวาส 96000` : null]));
await insertMany("order_items",
  ["id", "order_id", "shop_id", "menu_item_id", "name_snapshot", "unit_price_satang", "quantity", "line_total_satang"],
  items.map((it) => [it.id, it.order, SHOP, it.m.id, it.m.name, it.m.price, it.q, it.m.price * it.q]));
await insertMany("loyalty_points_transactions",
  ["id", "shop_id", "customer_id", "type", "quantity", "performed_by", "order_id", "reward_id", "note", "created_at"],
  ptx.map((x) => [x.id, SHOP, x.c, x.type, x.q, x.by, x.order, x.reward, x.note, iso(x.t)]));
await insertMany("loyalty_points_balances",
  ["id", "shop_id", "customer_id", "current_points", "lifetime_earned", "lifetime_redeemed", "updated_at"],
  [...balances].map(([cid, b]) => [sid(), SHOP, cid, b.cur, b.earned, b.redeemed, iso(b.last)]));
await insertMany("member_signup_attempts",
  ["id", "shop_id", "customer_id", "ip_hash", "device_id", "phone", "created_at"],
  attempts.map((a) => [a.id, SHOP, a.customerId, a.ip, null, a.phone, iso(a.created)]));
await insertMany("shop_blocked_phones", ["id", "shop_id", "phone", "created_by", "created_at"],
  blocked.map((b) => [b.id, SHOP, b.phone, ownerId, iso(b.t)]));
await insertMany("audit_logs",
  ["id", "actor_user_id", "actor_role", "action", "target_type", "target_id", "shop_id", "ip", "user_agent", "metadata", "created_at"],
  audits.map((a) => [sid(), ownerId, "shop_owner", a.action, a.type ?? "customer", a.target, SHOP, null, "seed-demo-history", a.meta ?? JSON.stringify({ sim: true }), iso(a.t)]));

const verify = {};
for (const t of SIM_TABLES) verify[t] = Number((await one(`select count(*) n from ${t} where shop_id = ? and id like 'sim\\_%' escape '\\'`, [SHOP])).n);
console.log("inserted (sim rows now in DB):", verify);
