import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
const c=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
const r=await c.execute("select id,email,is_active,password_hash,totp_confirmed_at is not null totp,login_otp_attempts,line_user_id is not null line,created_at from users where role='platform_admin'");
const seed=process.env.SEED_ADMIN_EMAIL;
for (const u of r.rows){ const ok = u.email===seed ? await bcrypt.compare(process.env.SEED_ADMIN_PASSWORD||"", u.password_hash) : null;
 console.log(JSON.stringify({email:u.email,active:u.is_active,totp:u.totp,otpAttempts:u.login_otp_attempts,line:u.line,created:u.created_at,isSeedEmail:u.email===seed,seedPwMatches:ok}));}
const m=await c.execute("select count(*) n, max(created_at) last from __drizzle_migrations"); console.log("migrations",JSON.stringify(m.rows[0]));
try{const rl=await c.execute("select key,count,reset_at from rate_limits where key like '%login%' or key like '%lock%' order by reset_at desc limit 5");console.log("ratelimits",JSON.stringify(rl.rows.map(x=>({k:String(x.key).replace(/[^:]+@[^:]+/,'<email>'),c:x.count,r:x.reset_at}))));}catch(e){console.log("rl err",e.message)}
