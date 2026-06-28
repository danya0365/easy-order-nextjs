<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Easy Order — Project Summary

**คืออะไร:** in-store self-ordering SaaS — ร้านวาง iPad/แท็บเล็ตที่เคาน์เตอร์ใน *kiosk mode*; ลูกค้า walk-in แตะเพื่อ browse เมนู → สร้าง cart → สั่ง → จ่ายด้วย **PromptPay QR หรือเงินสด**. ลูกค้าสั่งแบบ **ขาจรได้โดยไม่ต้อง login** — แต่ถ้าใส่ **ชื่อ+เบอร์มือถือ** จะผูกเป็นลูกค้าของร้านและเก็บ **ประวัติการสั่ง** ที่ลูกค้าเปิดดูเองด้วยมือถือได้ (ดู Customer identity ด้านล่าง). ร้านจัดการเมนูเอง + ทำ live order queue.

**ที่มา:** clone จาก **Easy Stamp** SaaS starter (v1.19.0) แล้วแทน domain แสตมป์สะสมด้วย in-store ordering. ส่วน generic ~40% (auth, billing, multi-tenant, notifications, audit, rate-limit, contact, ops, theming, i18n) reuse ตามเดิม. UI ภาษาไทย, v0.1.0.

**Requirement หลัก / anti-fraud:** order สร้างได้เฉพาะบนเครื่องที่ร้าน activate แล้วเท่านั้น (กันออเดอร์ปลอม/มั่วจากนอกร้าน). **"Easy" = หลักการของโปรดักต์**: flow ต้องง่าย touch-friendly · ลูกค้า**ไม่ต้องมี account/รหัสผ่าน** (สั่งขาจรได้; การระบุตัวตนเป็น optional ผ่านเบอร์มือถือ + สแกน QR เท่านั้น) · เสนอฟีเจอร์เพิ่มได้แต่ต้องคงข้อเหล่านี้.

**Scope decisions (ยืนยันแล้ว):**
- kiosk lock = **dedicated kiosk PIN** 4–6 หลัก (ไม่ใช่ session เต็มของเจ้าของ) — iPad รัน kiosk session แยก, ออกต้องใช้ PIN
- menu = **Category + Item** (`MenuCategory` + `MenuItem`)
- fulfillment = **order queue + สถานะ** (KDS-lite) + แจ้งเตือนออเดอร์ใหม่
- QR payment = ร้าน **กดยืนยันรับเงินเอง** (โชว์ PromptPay QR → ลูกค้าจ่าย → staff กด confirm) — ไม่มี gateway/slip
- tenant ยังเป็น `Shop` (+ `Branch`)
- **Customer identity + ประวัติการสั่ง — ✅ build แล้ว:** ลูกค้า optional ใส่ชื่อ+เบอร์ตอนสั่ง → `Customer` ต่อร้าน (phone, displayName, publicCode) ผูกกับ order; ลูกค้าสแกน **bind-code QR** บนจอ kiosk (ครั้งเดียว → httpOnly cookie `eo_member_<slug>`, ไม่ต้อง login) เปิดดู **ประวัติการสั่ง** ที่ `/s/[slug]` + `/me` ได้. ตาราง `customers`/`customer_devices`/`bind_codes`; use-cases ใน `application/use-cases/member/`. พอร์ตจาก customer model ของ Easy Stamp (แต้ม→ออเดอร์)

**Public homepage map + `/shops` directory — ✅ build แล้ว** (พอร์ตกลับจาก Easy Stamp ที่ตกหล่นตอน clone): หน้าแรก `/` แสดงแผนที่ maplibre (client-only, lazy) ปักหมุดสาขาที่เปิดอยู่ผ่าน `branchRepository.listMapLocations()` — popup ลิงก์ไป `/s/[slug]`; `/shops` เป็น directory รายชื่อร้านที่เปิดอยู่ (เวอร์ชั่นเรียบ — Easy Order ไม่มี reviews/categories/profile-image จึงไม่มี rating/filter chips แบบ Easy Stamp). คืน tab **Map/Shops** ใน `CustomerTabBar`. เป็น discovery/marketing ไม่ใช่สั่งของจากนอกร้าน. components ใน `src/presentation/components/map/`.

**Out of scope จริง (ห้ามเพิ่มโดยไม่ถาม):** customer **account/รหัสผ่าน** เต็มรูปแบบ (ระบุตัวตนใช้แค่เบอร์ + bind QR) · payment gateway/auto-verify · multi-locale (คง `th` เดี่ยว) · **การสั่งของจากนอกร้าน** (ออเดอร์ต้องมาจาก kiosk ที่ activate เท่านั้น).

**Domain model:** `MenuCategory` · `MenuItem` (ราคาเป็น **satang** integer) · `Order` (`orderNo` = running number รายวันต่อร้าน, รีเซ็ตทุกวัน Bangkok; `status` `pending → preparing → ready → completed` forward-only หรือ `cancelled`; `paymentMethod` `promptpay_qr|cash`; `paymentStatus` `unpaid|paid`) · `OrderItem` (**snapshot ชื่อ+ราคา** ตอนสั่ง — แก้เมนูทีหลังไม่กระทบประวัติ) · `kiosk_sessions`.

**Kiosk security model (จุดสำคัญ — ห้ามทำให้อ่อนลง):**
1. PIN เก็บเป็น bcrypt บน `shops.kioskPinHash` (`SetKioskPinUseCase`)
2. เจ้าของ (auth แล้ว) activate เครื่อง → `startKioskSession()` insert row + ตั้ง cookie **`eo_kiosk`** httpOnly (TTL ~12h)
3. `requireKioskShop()` ([`src/infrastructure/auth/kiosk.ts`](src/infrastructure/auth/kiosk.ts)) อ่าน cookie + validate ว่า row มีจริง+ไม่หมดอายุ → คืน `shopId`. cookie ปลอมที่ไม่มี row = reject
4. **`placeOrderAction` ดึง `shopId` จาก `requireKioskShop()` เท่านั้น** — ไม่เชื่อ client input → สั่งจากนอกร้านไม่ได้
5. ราคา/ชื่อมาจาก **DB** ใน `PlaceOrderUseCase` (lookup item ตาม id, ต้องเป็นของร้าน + available) — payload ปลอมเปลี่ยนยอดไม่ได้
6. placing order **rate-limited** ต่อ device+IP ผ่าน `sensitiveActionGuard`
7. ออกจาก kiosk **ต้องใช้ PIN** (`VerifyKioskPinUseCase` → `endKioskSession()` revoke row + clear cookie)

**3-tier split (ดู [`docs/REUSE_MAP.md`](docs/REUSE_MAP.md)):** 🟢 Tier 1 platform core (`container.generic.ts` / `GenericContainer` — ห้ามแตะ) · 🟡 Tier 2 storefront substrate (shop/branch/profile/reviews/map/directory/customer/leads/analytics/promote — reuse) · 🔴 Tier 3 vertical (menu/order/kiosk — เขียนใหม่ตอน fork). Tier 2 + Tier 3 repos register ใน [`src/infrastructure/di/container.ts`](src/infrastructure/di/container.ts) (`class Container extends GenericContainer`).

> Project Summary นี้คือ scope หลักของโปรเจค (auto-load ผ่าน `CLAUDE.md` → `@AGENTS.md`). Persistent memory เพิ่มเติมอยู่ใน [`.claude/memory/`](.claude/memory/). หัวข้ออื่นของ AGENTS.md ด้านล่าง inherit มาจาก Easy Stamp — reference ใดที่อ้างถึง stamp/แต้ม/บัตรสะสม ถือว่า stale (domain จริงคือ menu + order + kiosk + customer).

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

ห้าม hardcode ชื่อแอป ("Easy Order") — ใช้ `BRAND.*` จาก [`src/config/brand.ts`](src/config/brand.ts) เสมอ (name/tagline/description/totpIssuer/userAgent). เป็นจุดเดียวที่เปลี่ยนตอน clone เป็น product อื่น

# Rate-limit / กัน abuse

action ที่เสี่ยงถูก spam/brute-force ให้ผ่าน `container.sensitiveActionGuard` หรือ `container.rateLimitRepository` (เช่น รับออเดอร์ `placeOrder`, ยืนยัน PIN kiosk, ปิดร้านชั่วคราว, ยืนยัน OTP/2FA) — อย่าปล่อยไม่จำกัด

# Billing — ปิดร้านชั่วคราว (invariants ห้ามพลาด)

ดู memory + [`src/domain/services/subscription-status.ts`](src/domain/services/subscription-status.ts):
- คืนวันแบบ **floor วันเต็ม** (`resumeDueDate`/`frozenWholeDays`) — **ห้ามเปลี่ยนเป็น round/ceil** (เปิดช่องโหว่ปิดนอกเวลาทำการเพื่อใช้ฟรี)
- เพดาน `PAUSE_MAX_PER_30D` (8) + cooldown 24 ชม. คุมผ่าน guard ใน `pauseMyShopAction` · ข้อความ UI สื่อ "หยุดนับวัน / วันคงเหลือเท่าเดิม" ไม่ใช่ "คืน +N วัน"

# Ops / env / cron

- env ตรวจตอน boot ผ่าน [`instrumentation.ts`](instrumentation.ts) → `validateEnv()` ใน [`src/infrastructure/config/env.ts`](src/infrastructure/config/env.ts): **hard-fail gate ที่ `process.env.VERCEL` เท่านั้น** (ไม่ใช่ `isProd` — กัน local prod build พัง) · เพิ่ม required var อย่างระมัดระวัง
- มี `/api/health` (ping DB) สำหรับ uptime monitor
- **Vercel free = 1 cron** → มี schedule เดียว `/api/cron` (dispatcher). เพิ่มงาน cron ที่ [`app/api/cron/jobs.ts`](app/api/cron/jobs.ts) + toggle ด้วย env (`CRON_*`) — **อย่าเพิ่ม entry ใน `vercel.json`** จนกว่าจะอัปเกรดแพ็กเกจ

# Template discipline (โปรเจคนี้เป็นต้นแบบ SaaS)

- โค้ดใหม่จัดอยู่ใน **3 tier** (ดู [`docs/REUSE_MAP.md`](docs/REUSE_MAP.md)): 🟢 **Tier 1 platform core** · 🟡 **Tier 2 storefront substrate** (shop/profile สาธารณะ/รีวิว/แผนที่/directory/customer/leads/analytics/promote — reuse ทุก fork แค่ปรับ copy/metric) · 🔴 **Tier 3 vertical** (menu/order/kiosk — เขียนใหม่ตอน fork). **กฎ fork = keep by default ลบแค่ Tier 3** (~85% reuse) — ดู delete-manifest ที่ [`docs/FORKING.md`](docs/FORKING.md). **base ตั้งต้นจริงของ product family = `easy-stamp-nextjs`** (easy-order เป็น fork). อย่าลบ storefront (เคยพลาดตอน clone แล้วต้อง re-port 9 เฟส)
- งานค้างเพื่อให้พร้อมเป็น template (P2: PDPA, เทส action/tenant-isolation, retry/backup, magic-bytes, admin 2FA ฯลฯ) อยู่ใน [`docs/TEMPLATE_AUDIT.md`](docs/TEMPLATE_AUDIT.md) — อัปเดต checkbox เมื่อทำเพิ่ม
- คู่มือเพิ่มฟีเจอร์/เทส/deploy: [`docs/EXTENDING.md`](docs/EXTENDING.md) · [`docs/TESTING.md`](docs/TESTING.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

# Verification gate (ก่อนถือว่าเสร็จ)

ต้องเขียวครบ: `npx tsc --noEmit` · `npm run lint:all` · `npm test` · `npx next build`
- หลังลบ route: tsc อาจ error จาก `.next/types` เก่า → รัน `npx next build` ใหม่ typegen จะรีเฟรชเอง
- ใช้ `npx next build` (ไม่ใช่ `npm run build` ที่รัน vercel-migrate ก่อน — แม้จะ no-op นอก Vercel ก็เลี่ยงไว้)
