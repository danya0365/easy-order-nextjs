// Generates a random CRON_SECRET for the lead follow-up reminder cron
// (/api/cron/lead-follow-ups). Run it, then paste the value into your Vercel
// Production env vars (Settings > Environment Variables) as CRON_SECRET.
//
//   npm run gen:cron-secret
//
import { randomBytes } from "node:crypto";

const secret = randomBytes(32).toString("hex");

console.log("");
console.log("CRON_SECRET=" + secret);
console.log("");
console.log("→ Add this to Vercel (Production scope): Settings > Environment Variables");
console.log("  Vercel injects it as `Authorization: Bearer <CRON_SECRET>` on cron calls.");
console.log("  For local testing, put the same line in .env.local");
console.log("");
