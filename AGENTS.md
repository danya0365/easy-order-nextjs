<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Versioning

ทำตาม [`VERSIONING.md`](VERSIONING.md): ใช้ SemVer อิงฟีเจอร์ (PATCH=แก้บั๊ก/polish, MINOR=ฟีเจอร์ใหม่, MAJOR=เปลี่ยนใหญ่/breaking) — เลขเวอร์ชั่นมาจาก `version` ใน `package.json` ที่เดียว (ไหลเข้า footer อัตโนมัติ ไม่ต้องแก้ที่อื่น) ตอนออกรุ่น: อัปเดต `CHANGELOG.md` แล้วรัน `npm run release:patch|minor|major` (bump + commit + git tag) อย่า bump ทุก commit

# Architecture (Clean Architecture — บังคับใช้)

โครงสร้าง 4 layer ตาม skill [`nextjs-clean-arch-drizzle`](.agents/skills/nextjs-clean-arch-drizzle/SKILL.md) — dependency ทิศทางเดียว `domain → application → infrastructure → presentation` (ดูแผนภาพ [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)). **กฎเชิงโครงสร้างบังคับด้วยเครื่องแล้ว ไม่ต้องตรวจ manual:**
- **dependency-cruiser** ([`.dependency-cruiser.cjs`](.dependency-cruiser.cjs)) — `npm run depcruise` (อยู่ใน `lint:all` + CI): domain ต้อง pure · application ห้าม import infrastructure/ORM · component ห้ามแตะ DI container/repo · ทุก Drizzle repo + secret service ต้อง `import "server-only"` · ไม่มี dependency cycle
- **ESLint** มี tripwire เตือนทันทีตอนเขียน component ที่ import container/repo ผิด
- **ยังต้องพึ่ง test + review (semantic ที่ import-graph จับไม่ได้):** ทุก query scope ด้วย `shopId` · มี `requireRole()` · business logic อยู่ใน use case จริง — คุมด้วย integration test (`npm test`)
- **Auth เขียนข้อมูลที่ scope ด้วยร้าน:** ใช้ `requireShopWrite()` (เจ้าของ **หรือ** platform_admin ที่ impersonate — **impersonation เป็น read-write แล้ว** ไม่ใช่ read-only) แล้ว audit ด้วย `actor.id` (admin ตัวจริง) · read pages ใช้ `requireShopAccess()`

# CSS / Theming (บังคับใช้)

ระบบธีมแบบ semantic token (skill [`nextjs-semantic-theme`](.agents/skills/nextjs-semantic-theme/SKILL.md)) — **ห้าม hardcode สี** ใช้ utility ที่ map กับ token เสมอ (`bg-brand-500`, `text-on-brand`, `text-muted`, `bg-card`, `border-border`). บังคับด้วย linter:
- **ESLint** ([`eslint.config.mjs`](eslint.config.mjs)) กัน `bg-[#...]`/`text-[rgb(...)]` และ neutral palette (`text-gray-*`, `bg-slate-*`, …) ใน className — `npm run lint`
- **stylelint** ([`stylelint.config.mjs`](stylelint.config.mjs)) กัน hex/named color ใน `index.css` + `theme.css` (ชั้น token ต้องเป็น `var()` ล้วน; ค่า hex จริงอยู่ใน `themes/*.css` เท่านั้น) — `npm run lint:css`
- รันรวม: `npm run lint:all` · ข้อยกเว้นที่มีเหตุผล (เช่น brand color เจ้าอื่น) ใช้ `// eslint-disable-next-line no-restricted-syntax -- <เหตุผล>`

# i18n (next-intl)

โหมด **single-locale `th` ไม่มี i18n routing** (ไม่มี `[locale]` segment) — รายละเอียดใน [`docs/EXTENDING.md`](docs/EXTENDING.md):
- สตริง user-facing ใหม่ใช้ `t()` + ใส่ใน `messages/th.json` (อย่า hardcode) · keys ถูก type-check (`global.d.ts`)
- server component → `getTranslations`; client → `useTranslations`
- **client เห็นเฉพาะ namespace ที่อยู่ใน [`src/i18n/client-messages.ts`](src/i18n/client-messages.ts)** (กัน catalog บวม client bundle) — เพิ่ม client component ที่ใช้ namespace ใหม่ ต้องไปเติมที่ allowlist นั้น; server ใช้ได้ทุก namespace ฟรี
- **ห้ามเพิ่ม `middleware.ts`** (โปรเจคใช้ `proxy.ts`) · `app/global-error.tsx` ใช้ i18n ไม่ได้ (อยู่นอก provider) → คงข้อความ inline

# Brand / identity

ห้าม hardcode ชื่อแอป ("Easy Stamp") — ใช้ `BRAND.*` จาก [`src/config/brand.ts`](src/config/brand.ts) เสมอ (name/tagline/description/totpIssuer/userAgent). เป็นจุดเดียวที่เปลี่ยนตอน clone เป็น product อื่น

# Rate-limit / กัน abuse

action ที่เสี่ยงถูก spam/brute-force ให้ผ่าน `container.sensitiveActionGuard` หรือ `container.rateLimitRepository` (เช่น แจกแสตมป์, ปิดร้านชั่วคราว, ยืนยัน OTP/2FA) — อย่าปล่อยไม่จำกัด

# Billing — ปิดร้านชั่วคราว (invariants ห้ามพลาด)

ดู memory + [`src/domain/services/subscription-status.ts`](src/domain/services/subscription-status.ts):
- คืนวันแบบ **floor วันเต็ม** (`resumeDueDate`/`frozenWholeDays`) — **ห้ามเปลี่ยนเป็น round/ceil** (เปิดช่องโหว่ปิดนอกเวลาทำการเพื่อใช้ฟรี)
- เพดาน `PAUSE_MAX_PER_30D` (8) + cooldown 24 ชม. คุมผ่าน guard ใน `pauseMyShopAction` · ข้อความ UI สื่อ "หยุดนับวัน / วันคงเหลือเท่าเดิม" ไม่ใช่ "คืน +N วัน"

# Ops / env / cron

- env ตรวจตอน boot ผ่าน [`instrumentation.ts`](instrumentation.ts) → `validateEnv()` ใน [`src/infrastructure/config/env.ts`](src/infrastructure/config/env.ts): **hard-fail gate ที่ `process.env.VERCEL` เท่านั้น** (ไม่ใช่ `isProd` — กัน local prod build พัง) · เพิ่ม required var อย่างระมัดระวัง
- มี `/api/health` (ping DB) สำหรับ uptime monitor
- **Vercel free = 1 cron** → มี schedule เดียว `/api/cron` (dispatcher). เพิ่มงาน cron ที่ [`app/api/cron/jobs.ts`](app/api/cron/jobs.ts) + toggle ด้วย env (`CRON_*`) — **อย่าเพิ่ม entry ใน `vercel.json`** จนกว่าจะอัปเกรดแพ็กเกจ

# Template discipline (โปรเจคนี้เป็นต้นแบบ SaaS)

- โค้ดใหม่ให้รู้ว่าอยู่ฝั่ง **generic (reuse)** หรือ **domain (เขียนใหม่ตอน clone)** — ดู [`docs/REUSE_MAP.md`](docs/REUSE_MAP.md)
- งานค้างเพื่อให้พร้อมเป็น template (P2: PDPA, เทส action/tenant-isolation, retry/backup, magic-bytes, admin 2FA ฯลฯ) อยู่ใน [`docs/TEMPLATE_AUDIT.md`](docs/TEMPLATE_AUDIT.md) — อัปเดต checkbox เมื่อทำเพิ่ม
- คู่มือเพิ่มฟีเจอร์/เทส/deploy: [`docs/EXTENDING.md`](docs/EXTENDING.md) · [`docs/TESTING.md`](docs/TESTING.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

# Verification gate (ก่อนถือว่าเสร็จ)

ต้องเขียวครบ: `npx tsc --noEmit` · `npm run lint:all` · `npm test` · `npx next build`
- หลังลบ route: tsc อาจ error จาก `.next/types` เก่า → รัน `npx next build` ใหม่ typegen จะรีเฟรชเอง
- ใช้ `npx next build` (ไม่ใช่ `npm run build` ที่รัน vercel-migrate ก่อน — แม้จะ no-op นอก Vercel ก็เลี่ยงไว้)
